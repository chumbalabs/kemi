"""
MCP Client Manager with Rate Limiting and Connection Pooling
"""

import asyncio
import time
from typing import Dict, Any, Optional
from langchain_mcp_adapters.client import MultiServerMCPClient
import json
import logging

logger = logging.getLogger(__name__)

class MCPManager:
    """Manages MCP connections with rate limiting and error handling"""
    
    def __init__(self):
        self._client: Optional[MultiServerMCPClient] = None
        self._client_lock = asyncio.Lock()
        self._request_queue = []
        self._max_requests_per_minute = 5  # Very conservative limit
        self._request_delay = 8  # Much longer delay between requests
        self._last_request_time = 0
        self._global_request_lock = asyncio.Lock()  # Global lock for all requests
        
        # Circuit breaker pattern
        self._circuit_breaker_open = False
        self._circuit_breaker_opened_at = 0
        self._circuit_breaker_timeout = 300  # 5 minutes
        
    async def get_client(self) -> MultiServerMCPClient:
        """Get or create MCP client with connection pooling"""
        async with self._client_lock:
            if self._client is None:
                self._client = MultiServerMCPClient({
                    "coingecko": {
                        "transport": "sse",
                        "url": "https://mcp.api.coingecko.com/sse"
                    }
                })
            return self._client
    
    async def get_session(self):
        """Get or create a persistent session"""
        # For now, let's go back to creating sessions per request but with better management
        client = await self.get_client()
        return client.session("coingecko")
    
    async def _wait_for_rate_limit(self):
        """Implement rate limiting with delays"""
        now = time.time()
        
        # Clean old requests
        self._request_queue = [t for t in self._request_queue if now - t < 60]
        
        # Check if we need to wait
        if len(self._request_queue) >= self._max_requests_per_minute:
            wait_time = 60 - (now - self._request_queue[0]) + 10  # Extra 10 seconds buffer
            if wait_time > 0:
                logger.warning(f"⏳ Rate limit reached, waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)
        
        # Ensure minimum delay between requests
        time_since_last = now - self._last_request_time
        if time_since_last < self._request_delay:
            wait_time = self._request_delay - time_since_last
            await asyncio.sleep(wait_time)
        
        # Record this request
        self._request_queue.append(time.time())
        self._last_request_time = time.time()
    
    def _check_circuit_breaker(self) -> bool:
        """Check if circuit breaker should be opened/closed"""
        current_time = time.time()
        
        # If circuit breaker is open, check if timeout has passed
        if self._circuit_breaker_open:
            if current_time - self._circuit_breaker_opened_at > self._circuit_breaker_timeout:
                self._circuit_breaker_open = False
                logger.info("🔄 Circuit breaker closed, resuming API calls")
                return False
            else:
                remaining = self._circuit_breaker_timeout - (current_time - self._circuit_breaker_opened_at)
                logger.warning(f"⚡ Circuit breaker open, {remaining:.0f}s remaining")
                return True
        
        return False
    
    def _open_circuit_breaker(self):
        """Open circuit breaker after too many failures"""
        self._circuit_breaker_open = True
        self._circuit_breaker_opened_at = time.time()
        logger.error(f"⚡ Circuit breaker opened for {self._circuit_breaker_timeout}s due to repeated failures")

    async def call_tool_with_retry(
        self, 
        tool_name: str, 
        params: Dict[str, Any], 
        max_retries: int = 3
    ) -> Optional[Dict[str, Any]]:
        """Call MCP tool with rate limiting and retry logic"""
        
        # Check circuit breaker
        if self._check_circuit_breaker():
            return None
        
        # Use global lock to prevent concurrent requests
        async with self._global_request_lock:
            consecutive_429s = 0
            
            for attempt in range(max_retries):
                try:
                    # Wait for rate limit
                    await self._wait_for_rate_limit()
                    
                    # Create session for this request
                    session_manager = await self.get_session()
                    
                    async with session_manager as session:
                        result = await session.call_tool(tool_name, params)
                        data = json.loads(result.content[0].text)
                        logger.info(f"✅ MCP call successful: {tool_name}")
                        
                        # Reset circuit breaker on success
                        if self._circuit_breaker_open:
                            self._circuit_breaker_open = False
                            logger.info("🔄 Circuit breaker reset after successful call")
                        
                        return data
                        
                except Exception as e:
                    error_msg = str(e)
                    
                    if "429" in error_msg or "Too Many Requests" in error_msg:
                        consecutive_429s += 1
                        
                        # Open circuit breaker after too many 429s
                        if consecutive_429s >= 2:
                            self._open_circuit_breaker()
                            return None
                        
                        # Exponential backoff for rate limiting
                        wait_time = (2 ** attempt) * 20  # 20, 40, 80 seconds
                        logger.warning(f"🚫 Rate limited on attempt {attempt + 1}, waiting {wait_time}s")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    elif "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                        wait_time = (attempt + 1) * 5
                        logger.warning(f"🔌 Connection error on attempt {attempt + 1}, waiting {wait_time}s")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    else:
                        # Other errors - log and continue
                        logger.error(f"❌ MCP call failed on attempt {attempt + 1}: {error_msg}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(3)
                            continue
            
            logger.error(f"❌ All MCP attempts failed for {tool_name}")
            return None
    
    async def get_coin_data(self, coin_id: str) -> Optional[Dict[str, Any]]:
        """Get coin data with fallback"""
        return await self.call_tool_with_retry("get_id_coins", {
            "id": coin_id,
            "localization": False,
            "tickers": False,
            "market_data": True,
            "community_data": False,
            "developer_data": False,
            "sparkline": False
        })
    
    async def get_ohlc_data(self, coin_id: str, days: int = 30) -> Optional[list]:
        """Get OHLC data with fallback to market chart"""
        from datetime import datetime, timedelta
        
        end_timestamp = int(datetime.now().timestamp())
        start_timestamp = int((datetime.now() - timedelta(days=days)).timestamp())
        
        # Try OHLC first
        ohlc_data = await self.call_tool_with_retry("get_range_coins_ohlc", {
            "id": coin_id,
            "vs_currency": "usd",
            "from": start_timestamp,
            "to": end_timestamp,
            "interval": "daily"
        })
        
        if ohlc_data:
            return ohlc_data
        
        # Fallback to market chart
        logger.info(f"OHLC failed for {coin_id}, trying market chart")
        chart_data = await self.call_tool_with_retry("get_range_coins_market_chart", {
            "id": coin_id,
            "vs_currency": "usd",
            "from": start_timestamp,
            "to": end_timestamp,
            "interval": "daily"
        })
        
        if chart_data:
            # Convert market chart to OHLC format
            prices = chart_data.get('prices', [])
            volumes = chart_data.get('total_volumes', [])
            
            ohlc_data = []
            for i, price_point in enumerate(prices):
                timestamp, price = price_point
                volume = volumes[i][1] if i < len(volumes) else 0
                
                # Create OHLC entry (timestamp, open, high, low, close, volume)
                ohlc_data.append([timestamp, price, price, price, price, volume])
            
            return ohlc_data
        
        return None
    
    async def get_trending_coins(self) -> Optional[Dict[str, Any]]:
        """Get trending coins"""
        return await self.call_tool_with_retry("get_search_trending", {})
    
    async def get_global_data(self) -> Optional[Dict[str, Any]]:
        """Get global market data"""
        return await self.call_tool_with_retry("get_global", {})
    
    async def get_top_gainers_losers(
        self, 
        vs_currency: str = "usd", 
        duration: str = "24h", 
        top_coins: str = "1000"
    ) -> Optional[Dict[str, Any]]:
        """Get top gainers and losers"""
        return await self.call_tool_with_retry("get_coins_top_gainers_losers", {
            "vs_currency": vs_currency,
            "duration": duration,
            "top_coins": top_coins
        })
    
    async def get_coins_markets(self, params: Dict[str, Any]) -> Optional[list]:
        """Get coins market data"""
        return await self.call_tool_with_retry("get_coins_markets", params)
    
    async def cleanup(self):
        """Clean up resources"""
        logger.info("🧹 MCP manager cleaned up")

# Global instance
mcp_manager = MCPManager()