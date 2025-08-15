"""
Enhanced AI Chat Agent for Cryptocurrency Analysis
Provides intelligent market insights using direct MCP tool integration, Gemini AI, and ChromaDB caching
"""

import asyncio
import json
import time
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_mcp_adapters.client import MultiServerMCPClient

# ChromaDB for persistent caching
import chromadb
from chromadb.config import Settings

# Latest Gemini API
from google import genai

import os
from dotenv import load_dotenv

# Import existing services
from technical_analysis import TechnicalAnalyzer
from price_formatter import format_crypto_price

# Load environment variables
load_dotenv('../.env')

# Create router
router = APIRouter(prefix="/api/chat", tags=["chat-agent"])

# Initialize components
technical_analyzer = TechnicalAnalyzer()

# Initialize AI analyzer with compatibility for both APIs
from ai_analysis import AIAnalyzer
ai_analyzer = AIAnalyzer(gemini_api_key=os.getenv('GEMINI_API_KEY'))

# Import existing MCP manager instead of creating new one
from mcp_manager import mcp_manager

# Import ChromaDB cache
try:
    from chroma_cache import chroma_cache
    CHROMA_AVAILABLE = True
except ImportError:
    chroma_cache = None
    CHROMA_AVAILABLE = False

# ============================================================================
# DATA MODELS
# ============================================================================

class ChatMessage(BaseModel):
    """Individual chat message model"""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="ISO timestamp")
    coin_context: Optional[str] = Field(None, description="Related coin context")

class ChatRequest(BaseModel):
    """Chat request model"""
    message: str = Field(..., description="User message")
    conversation_history: List[ChatMessage] = Field(default_factory=list, description="Conversation history")
    coin_context: Optional[str] = Field(None, description="Current coin being viewed")
    include_market_data: bool = Field(True, description="Whether to include market data")

class ChatResponse(BaseModel):
    """Chat response model"""
    message: str = Field(..., description="AI response message")
    timestamp: str = Field(..., description="Response timestamp")
    suggestions: List[str] = Field(default_factory=list, description="Follow-up suggestions")
    coin_data: Optional[Dict[str, Any]] = Field(None, description="Related coin data")
    charts_data: Optional[Dict[str, Any]] = Field(None, description="Chart data if available")
    market_context: Optional[Dict[str, Any]] = Field(None, description="Market context used")

class MarketContext(BaseModel):
    """Market context data model"""
    timestamp: str
    market_summary: Optional[Dict[str, Any]] = None
    trending_coins: Optional[List[Dict[str, Any]]] = None
    top_gainers: Optional[List[Dict[str, Any]]] = None
    top_losers: Optional[List[Dict[str, Any]]] = None
    market_categories: Optional[List[Dict[str, Any]]] = None
    coin_data: Optional[Dict[str, Any]] = None
    available_tools: Optional[List[str]] = None

# ============================================================================
# RATE LIMITING & SECURITY
# ============================================================================

class RateLimiter:
    """Advanced rate limiting with IP tracking and circuit breaker"""
    
    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = {}
        self.blocked_ips: Dict[str, float] = {}
        self.block_duration = 300  # 5 minutes
    
    def is_allowed(self, client_ip: str) -> bool:
        """Check if request is allowed"""
        now = time.time()
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            if now - self.blocked_ips[client_ip] < self.block_duration:
                return False
            else:
                del self.blocked_ips[client_ip]
        
        # Initialize or clean old requests
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        
        # Remove old requests outside window
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < self.window_seconds
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.max_requests:
            self.blocked_ips[client_ip] = now
            return False
        
        # Add current request
        self.requests[client_ip].append(now)
        return True
    
    def get_status(self, client_ip: str) -> Dict[str, Any]:
        """Get rate limit status for an IP"""
        now = time.time()
        if client_ip in self.requests:
            recent_requests = len([req for req in self.requests[client_ip] 
                                 if now - req < self.window_seconds])
            return {
                "requests_used": recent_requests,
                "requests_remaining": self.max_requests - recent_requests,
                "reset_time": self.window_seconds - (now - self.requests[client_ip][0]) if self.requests[client_ip] else 0
            }
        return {"requests_used": 0, "requests_remaining": self.max_requests, "reset_time": 0}

# Initialize rate limiter
rate_limiter = RateLimiter(max_requests=20, window_seconds=60)

# ============================================================================
# CACHE INTEGRATION & TECHNICAL ANALYSIS
# ============================================================================
# Using ChromaDB persistent cache for fallback data

class DynamicCoinAnalysisMapper:
    """Dynamically maps user requests to appropriate coin analysis using MCP coin data"""
    
    def __init__(self):
        self._coins_cache = None
        self._cache_timestamp = 0
        self._cache_ttl = 3600  # 1 hour cache
    
    async def get_all_coins(self) -> List[Dict[str, Any]]:
        """Get all available coins from MCP with caching"""
        current_time = time.time()
        
        # Check if cache is valid
        if (self._coins_cache is not None and 
            current_time - self._cache_timestamp < self._cache_ttl):
            return self._coins_cache
        
        try:
            # Fetch all coins from MCP
            coins_data = await mcp_manager.call_tool_with_retry('get_coins_list', {})
            if coins_data:
                self._coins_cache = coins_data
                self._cache_timestamp = current_time
                print(f"✅ Cached {len(coins_data)} coins from MCP")
                return coins_data
            else:
                print("⚠️ No coins data returned from MCP")
                return self._coins_cache or []
        except Exception as e:
            print(f"⚠️ Failed to fetch coins list: {e}")
            return self._coins_cache or []
    
    async def find_coin_by_fuzzy_match(self, search_term: str) -> Optional[str]:
        """Find coin ID using fuzzy matching against name, symbol, and ID"""
        if not search_term:
            return None
        
        search_term = search_term.lower().strip()
        coins = await self.get_all_coins()
        
        if not coins:
            return None
        
        # Direct matches (highest priority)
        for coin in coins:
            coin_id = coin.get('id', '').lower()
            coin_name = coin.get('name', '').lower()
            coin_symbol = coin.get('symbol', '').lower()
            
            # Exact matches
            if search_term == coin_id or search_term == coin_name or search_term == coin_symbol:
                return coin.get('id')
        
        # Partial matches (medium priority)
        for coin in coins:
            coin_id = coin.get('id', '').lower()
            coin_name = coin.get('name', '').lower()
            coin_symbol = coin.get('symbol', '').lower()
            
            # Partial matches
            if (search_term in coin_name or 
                search_term in coin_symbol or 
                search_term in coin_id or
                coin_name.startswith(search_term) or
                coin_symbol.startswith(search_term)):
                return coin.get('id')
        
        # Fuzzy matches (lowest priority)
        for coin in coins:
            coin_name = coin.get('name', '').lower()
            coin_symbol = coin.get('symbol', '').lower()
            
            # Check if search term is contained within words
            name_words = coin_name.split()
            for word in name_words:
                if search_term in word or word.startswith(search_term):
                    return coin.get('id')
        
        return None
    
    async def extract_coin_from_message(self, message: str) -> Optional[str]:
        """Extract coin ID from user message using AI-powered pattern recognition"""
        message_lower = message.lower()
        
        # Analysis patterns to extract coin names
        analysis_patterns = [
            r'analyze\s+(\w+)',
            r'analyse\s+(\w+)', 
            r'analysis\s+(?:of|for)\s+(\w+)',
            r'tell\s+me\s+about\s+(\w+)',
            r'what\s+about\s+(\w+)',
            r'how\s+is\s+(\w+)',
            r'price\s+of\s+(\w+)',
            r'technical\s+analysis\s+(?:of|for)\s+(\w+)',
            r'(\w+)\s+analysis',
            r'(\w+)\s+performing',
            r'(\w+)\s+price',
            r'(\w+)\s+trend',
            r'buy\s+(\w+)',
            r'sell\s+(\w+)',
            r'invest\s+in\s+(\w+)',
            r'(\w+)\s+investment',
            r'(\w+)\s+market',
            r'(\w+)\s+trading'
        ]
        
        import re
        
        # Try to extract coin names using patterns
        potential_coins = set()
        
        for pattern in analysis_patterns:
            matches = re.findall(pattern, message_lower)
            for match in matches:
                if isinstance(match, tuple):
                    potential_coins.update(match)
                else:
                    potential_coins.add(match)
        
        # Also extract standalone words that might be coin names
        words = re.findall(r'\b[a-zA-Z]{2,20}\b', message_lower)
        
        # Filter out common English words
        common_words = {
            'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'for',
            'with', 'he', 'be', 'it', 'by', 'this', 'have', 'from', 'or', 'one', 'had',
            'but', 'not', 'what', 'all', 'were', 'they', 'we', 'when', 'your', 'can',
            'said', 'there', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will',
            'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some',
            'her', 'would', 'make', 'like', 'into', 'him', 'has', 'two', 'more', 'very',
            'after', 'use', 'our', 'way', 'work', 'first', 'well', 'water', 'been',
            'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down', 'day', 'did',
            'get', 'come', 'made', 'may', 'part', 'over', 'new', 'sound', 'take', 'only',
            'little', 'work', 'know', 'place', 'year', 'live', 'me', 'back', 'give',
            'most', 'very', 'good', 'man', 'think', 'say', 'great', 'where', 'help',
            'through', 'much', 'before', 'line', 'right', 'too', 'mean', 'old', 'any',
            'same', 'tell', 'boy', 'follow', 'came', 'want', 'show', 'also', 'around',
            'form', 'three', 'small', 'set', 'put', 'end', 'why', 'again', 'turn',
            'here', 'off', 'went', 'old', 'number', 'great', 'tell', 'men', 'say',
            'small', 'every', 'found', 'still', 'between', 'name', 'should', 'home',
            'big', 'give', 'air', 'line', 'set', 'own', 'under', 'read', 'last',
            'never', 'us', 'left', 'end', 'along', 'while', 'might', 'next', 'sound',
            'below', 'saw', 'something', 'thought', 'both', 'few', 'those', 'always',
            'looked', 'show', 'large', 'often', 'together', 'asked', 'house', 'don',
            'world', 'going', 'want', 'school', 'important', 'until', 'form', 'food',
            'keep', 'children', 'feet', 'land', 'side', 'without', 'boy', 'once',
            'animal', 'life', 'enough', 'took', 'sometimes', 'four', 'head', 'above',
            'kind', 'began', 'almost', 'live', 'page', 'got', 'earth', 'need', 'far',
            'hand', 'high', 'year', 'mother', 'light', 'country', 'father', 'let',
            'night', 'picture', 'being', 'study', 'second', 'soon', 'story', 'since',
            'white', 'ever', 'paper', 'hard', 'near', 'sentence', 'better', 'best',
            'across', 'during', 'today', 'however', 'sure', 'knew', 'it', 'try',
            'told', 'young', 'sun', 'thing', 'whole', 'hear', 'example', 'heard',
            'several', 'change', 'answer', 'room', 'sea', 'against', 'top', 'turned',
            'learn', 'point', 'city', 'play', 'toward', 'five', 'himself', 'usually',
            'money', 'seen', 'didn', 'car', 'morning', 'i', 'getting', 'hard', 'order',
            'red', 'door', 'sure', 'become', 'top', 'ship', 'across', 'today', 'during',
            'short', 'better', 'best', 'however', 'low', 'hours', 'black', 'products',
            'happened', 'whole', 'measure', 'remember', 'early', 'waves', 'reached',
            'analyze', 'analyse', 'analysis', 'technical', 'price', 'market', 'trading',
            'investment', 'crypto', 'cryptocurrency', 'coin', 'token', 'blockchain',
            'performing', 'trend', 'bullish', 'bearish', 'buy', 'sell', 'hold'
        }
        
        # Add words that might be coins
        for word in words:
            if len(word) >= 2 and word not in common_words:
                potential_coins.add(word)
        
        # Try to find matches for each potential coin
        for potential_coin in potential_coins:
            if len(potential_coin) >= 2:  # Minimum 2 characters
                coin_id = await self.find_coin_by_fuzzy_match(potential_coin)
                if coin_id:
                    print(f"✅ Matched '{potential_coin}' to coin ID: {coin_id}")
                    return coin_id
        
        return None

# Initialize the dynamic mapper
coin_mapper = DynamicCoinAnalysisMapper()

async def fetch_comprehensive_coin_analysis(coin_id: str) -> Optional[Dict[str, Any]]:
    """Fetch comprehensive technical analysis + real-time price for any coin"""
    try:
        import httpx
        
        # Fetch both technical analysis and real-time market data
        async with httpx.AsyncClient() as client:
            # Get technical analysis
            tech_response = await client.get(f"http://localhost:8000/api/coins/{coin_id}/technical?days=30")
            
            # Get real-time market data from MCP
            market_data = await mcp_manager.get_coin_data(coin_id)
            
            if tech_response.status_code == 200:
                data = tech_response.json()
                
                # Extract comprehensive technical data
                technical_analysis = data.get('technical_analysis', {})
                indicators = technical_analysis.get('indicators', {})
                signals = technical_analysis.get('signals', {})
                trend_analysis = technical_analysis.get('trend_analysis', {})
                
                # Get real-time price from market data
                current_price = 0
                price_change_24h = 0
                market_cap = 0
                volume_24h = 0
                market_cap_rank = None
                
                if market_data:
                    market_info = market_data.get('market_data', {})
                    current_price = market_info.get('current_price', {}).get('usd', 0)
                    price_change_24h = market_info.get('price_change_percentage_24h', 0)
                    market_cap = market_info.get('market_cap', {}).get('usd', 0)
                    volume_24h = market_info.get('total_volume', {}).get('usd', 0)
                    market_cap_rank = market_data.get('market_cap_rank')
                
                # Use technical analysis current price as fallback
                if current_price == 0:
                    current_price = indicators.get('current_price', 0)
                
                return {
                    "id": coin_id,
                    "name": market_data.get('name', coin_id.replace('-', ' ').title()) if market_data else coin_id.replace('-', ' ').title(),
                    "symbol": market_data.get('symbol', coin_id.upper()[:3]).upper() if market_data else coin_id.upper()[:3],
                    "analysis_type": "comprehensive_technical",
                    "data_points": data.get('data_points', 0),
                    "analysis_period_days": data.get('analysis_period_days', 30),
                    
                    # Real-time Market Data
                    "current_price": current_price,
                    "price_change_24h": price_change_24h,
                    "market_cap": market_cap,
                    "volume_24h": volume_24h,
                    "market_cap_rank": market_cap_rank,
                    
                    # Technical Indicators
                    "sma_20": indicators.get('sma_20', 0),
                    "sma_50": indicators.get('sma_50', 0),
                    "ema_12": indicators.get('ema_12', 0),
                    "ema_26": indicators.get('ema_26', 0),
                    "rsi": indicators.get('rsi', 0),
                    "macd": indicators.get('macd', 0),
                    "macd_signal": indicators.get('macd_signal', 0),
                    "macd_histogram": indicators.get('macd_histogram', 0),
                    "volatility": indicators.get('volatility', 0),
                    
                    # Bollinger Bands
                    "bollinger_upper": indicators.get('bollinger_bands', {}).get('upper', 0),
                    "bollinger_middle": indicators.get('bollinger_bands', {}).get('middle', 0),
                    "bollinger_lower": indicators.get('bollinger_bands', {}).get('lower', 0),
                    
                    # Support & Resistance
                    "support_level": indicators.get('support_resistance', {}).get('support', 0),
                    "resistance_level": indicators.get('support_resistance', {}).get('resistance', 0),
                    
                    # Trading Signals
                    "trend": signals.get('trend', 'neutral'),
                    "trend_strength": signals.get('strength', 'weak'),
                    "recommendation": signals.get('recommendation', 'hold'),
                    "confidence": signals.get('confidence', 0),
                    "signals_detected": signals.get('signals', []),
                    
                    # Trend Analysis
                    "short_term_trend": trend_analysis.get('short_term', 'neutral'),
                    "medium_term_trend": trend_analysis.get('medium_term', 'neutral'),
                    "long_term_trend": trend_analysis.get('long_term', 'neutral'),
                    
                    # Analysis Quality
                    "analysis_quality": technical_analysis.get('summary', {}).get('analysis_quality', 'unknown'),
                    "last_updated": data.get('last_updated', datetime.utcnow().isoformat())
                }
            else:
                print(f"⚠️ Technical analysis endpoint for {coin_id} returned {tech_response.status_code}")
                return None
                
    except Exception as e:
        print(f"⚠️ Failed to fetch comprehensive analysis for {coin_id}: {e}")
        return None

# ============================================================================
# MCP INTEGRATION
# ============================================================================
# Using existing MCP manager from main application for consistency

# ============================================================================
# MARKET DATA FETCHING
# ============================================================================

async def fetch_comprehensive_market_data(
    request_message: str, 
    coin_context: Optional[str] = None
) -> MarketContext:
    """Fetch comprehensive market data using existing MCP manager with ChromaDB caching"""
    
    context = MarketContext(timestamp=datetime.utcnow().isoformat())
    
    try:
        # Clean expired ChromaDB cache periodically
        if CHROMA_AVAILABLE and time.time() % 3600 < 1:  # Every hour
            chroma_cache.clear_expired(max_age_days=1)
        
        # Get available tools from existing MCP manager
        try:
            # This uses the existing MCP manager's get_tools method
            context.available_tools = ["get_global", "get_search_trending", "get_coins_top_gainers_losers", "get_list_coins_categories", "get_id_coins"]
            print(f"🔧 Using existing MCP manager with {len(context.available_tools)} tools")
        except Exception as e:
            print(f"⚠️ Failed to get MCP tools: {e}")
        
        # Fetch global market data using existing MCP manager
        try:
            global_result = await mcp_manager.get_global_data()
            if global_result and 'data' in global_result:
                market_data = global_result['data']
                context.market_summary = {
                    "total_market_cap": market_data.get('total_market_cap', {}).get('usd', 0),
                    "market_cap_change_24h": market_data.get('market_cap_change_percentage_24h_usd', 0),
                    "bitcoin_dominance": market_data.get('market_cap_percentage', {}).get('btc', 0),
                    "active_cryptocurrencies": market_data.get('active_cryptocurrencies', 0),
                    "total_volume_24h": market_data.get('total_volume', {}).get('usd', 0)
                }
                print(f"✅ Global market data fetched via existing MCP manager")
        except Exception as e:
            print(f"⚠️ Global data fetch error: {e}")
            # Try ChromaDB fallback
            if CHROMA_AVAILABLE:
                cached_global = chroma_cache.get_stale("global_market_data")
                if cached_global and 'data' in cached_global:
                    market_data = cached_global['data']
                    context.market_summary = {
                        "total_market_cap": market_data.get('total_market_cap', {}).get('usd', 0),
                        "market_cap_change_24h": market_data.get('market_cap_change_percentage_24h_usd', 0),
                        "bitcoin_dominance": market_data.get('market_cap_percentage', {}).get('btc', 0),
                        "active_cryptocurrencies": market_data.get('active_cryptocurrencies', 0),
                        "total_volume_24h": market_data.get('total_volume', {}).get('usd', 0)
                    }
                    print(f"✅ Global market data from ChromaDB fallback")
        
        # Fetch trending coins using existing MCP manager
        try:
            trending_result = await mcp_manager.get_trending_coins()
            if trending_result and 'coins' in trending_result:
                context.trending_coins = trending_result['coins'][:5]
                print(f"✅ Trending coins fetched: {len(trending_result['coins'])} coins")
        except Exception as e:
            print(f"⚠️ Trending coins fetch error: {e}")
            # Try ChromaDB fallback
            if CHROMA_AVAILABLE:
                cached_trending = chroma_cache.get_stale("trending_coins")
                if cached_trending and 'coins' in cached_trending:
                    context.trending_coins = cached_trending['coins'][:5]
                    print(f"✅ Trending coins from ChromaDB fallback")
        
        # Fetch top gainers and losers for market analysis
        if any(keyword in request_message.lower() for keyword in 
               ['trending', 'trend', 'popular', 'hot', 'what\'s happening', 'market', 'performance']):
            try:
                gainers_result = await mcp_manager.get_top_gainers_losers("usd", "24h", "1000")
                
                if gainers_result:
                    # The existing MCP manager returns structured data
                    context.top_gainers = gainers_result.get('top_gainers', [])[:3]
                    context.top_losers = gainers_result.get('top_losers', [])[:3]
                    print(f"✅ Top gainers/losers fetched via existing MCP manager")
            except Exception as e:
                print(f"⚠️ Top gainers/losers fetch error: {e}")
                # Try ChromaDB fallback
                if CHROMA_AVAILABLE:
                    cached_gainers = chroma_cache.get_stale("top_gainers_losers_usd_24h_1000")
                    if cached_gainers:
                        context.top_gainers = cached_gainers.get('top_gainers', [])[:3]
                        context.top_losers = cached_gainers.get('top_losers', [])[:3]
                        print(f"✅ Top gainers/losers from ChromaDB fallback")
        
        # Fetch specific coin data if context provided
        if coin_context:
            try:
                # Use dynamic mapper to find the correct coin ID
                mapped_coin_id = await coin_mapper.find_coin_by_fuzzy_match(coin_context)
                if not mapped_coin_id:
                    mapped_coin_id = coin_context  # Fallback to original
                
                # Try to get comprehensive technical analysis first
                context.coin_data = await fetch_comprehensive_coin_analysis(mapped_coin_id)
                if context.coin_data:
                    print(f"✅ Comprehensive technical analysis fetched for {mapped_coin_id}")
                else:
                    # Fallback to basic MCP data
                    coin_result = await mcp_manager.get_coin_data(mapped_coin_id)
                    if coin_result:
                        market_data = coin_result.get('market_data', {})
                        context.coin_data = {
                            "id": coin_result.get('id'),
                            "name": coin_result.get('name'),
                            "symbol": coin_result.get('symbol'),
                            "current_price": market_data.get('current_price', {}).get('usd', 0),
                            "price_change_24h": market_data.get('price_change_percentage_24h', 0),
                            "market_cap_rank": coin_result.get('market_cap_rank'),
                            "market_cap": market_data.get('market_cap', {}).get('usd', 0),
                            "total_volume": market_data.get('total_volume', {}).get('usd', 0),
                            "ath": market_data.get('ath', {}).get('usd', 0),
                            "ath_change_percentage": market_data.get('ath_change_percentage', {}).get('usd', 0),
                            "analysis_type": "basic_market_data"
                        }
                        print(f"✅ Basic market data fetched for {mapped_coin_id}")
            except Exception as e:
                print(f"⚠️ Coin data fetch error: {e}")
        
        # Intelligently detect coin mentions in user message using dynamic analysis
        else:
            detected_coin = await coin_mapper.extract_coin_from_message(request_message)
            if detected_coin:
                try:
                    context.coin_data = await fetch_comprehensive_coin_analysis(detected_coin)
                    if context.coin_data:
                        print(f"✅ Comprehensive analysis fetched for {detected_coin} from user query")
                    else:
                        # Fallback to basic MCP data
                        coin_result = await mcp_manager.get_coin_data(detected_coin)
                        if coin_result:
                            market_data = coin_result.get('market_data', {})
                            context.coin_data = {
                                "id": coin_result.get('id'),
                                "name": coin_result.get('name'),
                                "symbol": coin_result.get('symbol'),
                                "current_price": market_data.get('current_price', {}).get('usd', 0),
                                "price_change_24h": market_data.get('price_change_percentage_24h', 0),
                                "market_cap_rank": coin_result.get('market_cap_rank'),
                                "market_cap": market_data.get('market_cap', {}).get('usd', 0),
                                "total_volume": market_data.get('total_volume', {}).get('usd', 0),
                                "ath": market_data.get('ath', {}).get('usd', 0),
                                "ath_change_percentage": market_data.get('ath_change_percentage', {}).get('usd', 0),
                                "analysis_type": "basic_market_data"
                            }
                            print(f"✅ Basic market data fetched for {detected_coin} from user query")
                except Exception as e:
                    print(f"⚠️ Detected coin analysis fetch error: {e}")
    
    except Exception as e:
        print(f"❌ Comprehensive market data fetch error: {e}")
    
    return context

# ============================================================================
# PROMPT ENGINEERING
# ============================================================================

def create_intelligent_prompt(
    user_message: str,
    conversation_history: List[ChatMessage],
    market_context: MarketContext,
    coin_context: Optional[str] = None
) -> str:
    """Create intelligent prompt with comprehensive market context"""
    
    # Build conversation context
    conversation_context = ""
    if conversation_history:
        recent_messages = conversation_history[-3:]  # Last 3 messages
        conversation_context = "\n".join([
            f"{msg.role.title()}: {msg.content[:100]}{'...' if len(msg.content) > 100 else ''}"
            for msg in recent_messages
        ])
    
    # Build comprehensive market overview
    market_info = ""
    if market_context.market_summary:
        ms = market_context.market_summary
        market_info = f"""
CURRENT MARKET DATA (Real-time via MCP):
- Total Market Cap: ${ms['total_market_cap']:,.0f}
- 24h Market Cap Change: {ms['market_cap_change_24h']:+.2f}%
- Bitcoin Dominance: {ms['bitcoin_dominance']:.1f}%
- Active Cryptocurrencies: {ms['active_cryptocurrencies']:,}
- 24h Total Volume: ${ms.get('total_volume_24h', 0):,.0f}
"""
    
    # Build trending analysis
    trending_info = ""
    if market_context.trending_coins:
        trending_info = f"""
TOP TRENDING COINS (Real-time via MCP):
"""
        for i, coin in enumerate(market_context.trending_coins, 1):
            coin_data = coin.get('item', {})
            trending_info += f"{i}. {coin_data.get('name', 'Unknown')} ({coin_data.get('symbol', 'N/A').upper()}) - Rank #{coin_data.get('market_cap_rank', 'N/A')}\n"
    
    # Build market performance analysis
    performance_info = ""
    if market_context.top_gainers or market_context.top_losers:
        performance_info = f"""
MARKET PERFORMANCE ANALYSIS (24h via MCP):
"""
        if market_context.top_gainers:
            performance_info += "Top Gainers:\n"
            for i, coin in enumerate(market_context.top_gainers, 1):
                performance_info += f"  {i}. {coin.get('name', 'Unknown')} ({coin.get('symbol', 'N/A').upper()}) +{coin.get('usd_24h_change', 0):.1f}%\n"
        
        if market_context.top_losers:
            performance_info += "Top Losers:\n"
            for i, coin in enumerate(market_context.top_losers, 1):
                performance_info += f"  {i}. {coin.get('name', 'Unknown')} ({coin.get('symbol', 'N/A').upper()}) {coin.get('usd_24h_change', 0):.1f}%\n"
    
    # Build market categories
    categories_info = ""
    if market_context.market_categories:
        categories_info = f"""
MARKET CATEGORIES (via MCP):
"""
        for i, category in enumerate(market_context.market_categories, 1):
            categories_info += f"{i}. {category.get('name', 'Unknown')} - {category.get('category_id', 'N/A')}\n"
    
    # Build detailed coin analysis
    coin_info = ""
    if market_context.coin_data:
        cd = market_context.coin_data
        
        if cd.get('analysis_type') == 'comprehensive_technical':
            # Comprehensive technical analysis with real-time data
            coin_info = f"""
COMPREHENSIVE TECHNICAL ANALYSIS ({cd['name']} - {cd['symbol'].upper()}):
REAL-TIME MARKET DATA:
- Current Price: ${cd['current_price']:,.4f}
- 24h Change: {cd.get('price_change_24h', 0):+.2f}%
- Market Cap: ${cd.get('market_cap', 0):,.0f}
- 24h Volume: ${cd.get('volume_24h', 0):,.0f}
- Market Cap Rank: #{cd.get('market_cap_rank', 'N/A')}

TECHNICAL ANALYSIS ({cd['data_points']} data points, {cd['analysis_period_days']} days):
- Analysis Quality: {cd['analysis_quality'].title()}
- RSI (14): {cd['rsi']:.1f} - {'Overbought' if cd['rsi'] > 70 else 'Oversold' if cd['rsi'] < 30 else 'Neutral'}
- MACD: {cd['macd']:.4f} (Signal: {cd['macd_signal']:.4f})
- Volatility: {cd['volatility']:.2f}%

MOVING AVERAGES:
- SMA 20: ${cd['sma_20']:,.4f}
- SMA 50: ${cd['sma_50']:,.4f}
- EMA 12: ${cd['ema_12']:,.4f}
- EMA 26: ${cd['ema_26']:,.4f}

BOLLINGER BANDS:
- Upper: ${cd['bollinger_upper']:,.4f}
- Middle: ${cd['bollinger_middle']:,.4f}
- Lower: ${cd['bollinger_lower']:,.4f}

SUPPORT & RESISTANCE:
- Support Level: ${cd['support_level']:,.4f}
- Resistance Level: ${cd['resistance_level']:,.4f}

TRADING SIGNALS:
- Overall Trend: {cd['trend'].title()} ({cd['trend_strength'].title()} strength)
- Recommendation: {cd['recommendation'].upper()}
- Confidence: {cd['confidence']:.1f}%
- Short-term Trend: {cd['short_term_trend'].title()}
- Medium-term Trend: {cd['medium_term_trend'].title()}
- Long-term Trend: {cd['long_term_trend'].title()}

DETECTED SIGNALS:
{chr(10).join(f"• {signal}" for signal in cd.get('signals_detected', ['No specific signals detected']))}
"""
        else:
            # Basic market data
            coin_info = f"""
BASIC MARKET DATA ({cd['name']} - {cd['symbol'].upper()}):
- Current Price: ${cd['current_price']:,.4f}
- 24h Change: {cd['price_change_24h']:+.2f}%
- Market Cap Rank: #{cd.get('market_cap_rank', 'N/A')}
- Market Cap: ${cd.get('market_cap', 0):,.0f}
- 24h Volume: ${cd.get('total_volume', 0):,.0f}
- All-Time High: ${cd.get('ath', 0):,.4f}
- ATH Change: {cd.get('ath_change_percentage', 0):+.2f}%
"""
    
    # Build available tools info
    tools_info = ""
    if market_context.available_tools:
        tools = market_context.available_tools
        tools_info = f"""
AVAILABLE MCP TOOLS ({len(tools)}):
{', '.join(tools[:10])}{'...' if len(tools) > 10 else ''}
"""
    
    prompt = f"""You are Kemi, an expert cryptocurrency analysis AI assistant with access to comprehensive real-time market data via MCP tools. Use the actual data provided below to give accurate, current responses.

{tools_info}

{market_info}

{trending_info}

{performance_info}

{categories_info}

{coin_info}

{f"Recent conversation: {conversation_context}" if conversation_context else ""}

User question: {user_message}

CRITICAL INSTRUCTIONS:
1. Use ONLY the real market data provided above in your response
2. Do NOT use placeholder text like [insert current BTC price]
3. If you have specific data, use it to provide actionable insights
4. If you don't have data for something, say "I don't have current data for that"
5. Provide market sentiment analysis based on gainers/losers data
6. Reference specific trending coins when relevant
7. Be conversational but professional and informative
8. Include relevant disclaimers about financial advice
9. Provide actionable insights users can act upon

Response Guidelines:
- Maximum 300 words
- Focus on current market conditions and trends
- Use specific numbers and data when available
- Provide context for market movements
- Suggest relevant follow-up questions

Remember: This is not financial advice. Users should always do their own research before making investment decisions."""
    
    return prompt

# ============================================================================
# AI RESPONSE GENERATION
# ============================================================================

async def generate_ai_response(prompt: str) -> AsyncGenerator[str, None]:
    """Generate streaming AI response using existing AI analyzer"""
    try:
        if not ai_analyzer.gemini_client and not ai_analyzer.gemini_model:
            yield "I'm sorry, but the AI analysis service is currently unavailable. Please try again later."
            return
        
        # Generate response using existing AI analyzer
        if ai_analyzer.api_type == "new" and ai_analyzer.gemini_client:
            # Use new API
            response = await asyncio.to_thread(
                ai_analyzer.gemini_client.models.generate_content,
                model="gemini-2.0-flash-exp",
                contents=prompt
            )
            response_text = response.text
        elif ai_analyzer.api_type == "old" and ai_analyzer.gemini_model:
            # Use old API
            response = await asyncio.to_thread(ai_analyzer.gemini_model.generate_content, prompt)
            response_text = response.text
        else:
            yield "I'm sorry, but the AI analysis service is currently unavailable. Please try again later."
            return
        
        # Stream the response word by word for better UX
        words = response_text.split()
        for i, word in enumerate(words):
            yield word + " "
            if i % 5 == 0:  # Add small delays every few words
                await asyncio.sleep(0.03)
                
    except Exception as e:
        error_msg = str(e)
        print(f"AI response generation error: {error_msg}")
        
        # Handle quota exceeded gracefully
        if "quota" in error_msg.lower() or "429" in error_msg:
            yield "I'm currently experiencing high demand and have reached my API limits. Please try again in a few minutes, or I can help you with cached market data if available."
        else:
            yield f"I apologize, but I'm experiencing some technical difficulties right now. Please try asking your question again in a moment. 🤖"

# ============================================================================
# SUGGESTION ENGINE
# ============================================================================

def generate_contextual_suggestions(
    user_message: str, 
    market_context: MarketContext,
    coin_context: Optional[str] = None
) -> List[str]:
    """Generate intelligent, context-aware suggestions"""
    
    suggestions = []
    message_lower = user_message.lower()
    
    # Coin-specific suggestions
    if coin_context:
        suggestions.extend([
            f"What's the technical analysis for {coin_context}?",
            f"Is {coin_context} a good buy right now?",
            f"What are the risks with {coin_context}?",
            f"Compare {coin_context} to Bitcoin"
        ])
    
    # Market analysis suggestions
    if any(word in message_lower for word in ['trending', 'trend', 'market', 'performance']):
        suggestions.extend([
            "What's the market sentiment today?",
            "Which coins are showing strong momentum?",
            "What sectors are performing well?",
            "Show me the biggest movers"
        ])
    
    # Technical analysis suggestions
    if any(word in message_lower for word in ['price', 'prediction', 'forecast', 'analysis']):
        suggestions.extend([
            "What factors affect crypto prices?",
            "How do you analyze market trends?",
            "What are the best trading indicators?",
            "What's your market outlook?"
        ])
    
    # Educational suggestions
    if any(word in message_lower for word in ['explain', 'how', 'what is', 'basics']):
        suggestions.extend([
            "Explain technical analysis basics",
            "How do I evaluate a cryptocurrency?",
            "What should beginners know?",
            "How do DeFi protocols work?"
        ])
    
    # Default suggestions if none match
    if not suggestions:
        suggestions = [
            "What's happening in crypto today?",
            "Explain Bitcoin basics",
            "How do I analyze crypto trends?",
            "What should beginners know about crypto?"
        ]
    
    return suggestions[:4]  # Return top 4 suggestions

# ============================================================================
# MAIN CHAT ENDPOINT
# ============================================================================

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(request: ChatRequest):
    """Enhanced chat endpoint with comprehensive market data"""
    
    print(f"🚀 Chat request: {request.message[:50]}...")
    
    try:
        # Rate limiting
        client_ip = "default"  # In production, get from request
        if not rate_limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=429, 
                detail="Too many messages. Please wait a moment."
            )
        
        # Fetch comprehensive market data
        market_context = await fetch_comprehensive_market_data(
            request.message,
            request.coin_context
        )
        
        print(f"✅ Market context fetched with {len(market_context.available_tools or [])} MCP tools")
        
        # Create intelligent prompt
        prompt = create_intelligent_prompt(
            request.message,
            request.conversation_history[-3:] if request.conversation_history else [],
            market_context,
            request.coin_context
        )
        
        # Generate AI response with timeout
        response_text = ""
        try:
            async def generate_response():
                result = ""
                async for chunk in generate_ai_response(prompt):
                    result += chunk
                return result
            
            response_text = await asyncio.wait_for(generate_response(), timeout=30.0)
        except asyncio.TimeoutError:
            response_text = "I apologize, but I'm taking too long to respond. Let me give you a quick answer: I'm here to help with crypto analysis! Please try asking your question again."
        
        # Generate contextual suggestions
        suggestions = generate_contextual_suggestions(
            request.message,
            market_context,
            request.coin_context
        )
        
        # Create response
        response_data = ChatResponse(
            message=response_text.strip(),
            timestamp=datetime.utcnow().isoformat(),
            suggestions=suggestions,
            coin_data=market_context.coin_data,
            charts_data=None,
            market_context=market_context.dict()
        )
        
        print(f"✅ Chat response generated successfully")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Chat error: {e}")
        
        # Return fallback response
        return ChatResponse(
            message="I'm experiencing some technical difficulties right now. I'm Kemi, your crypto AI assistant. Please try asking your question again!",
            timestamp=datetime.utcnow().isoformat(),
            suggestions=[
                "What's happening in crypto today?",
                "Explain Bitcoin basics",
                "How do I analyze crypto trends?"
            ],
            coin_data=None,
            charts_data=None,
            market_context=None
        )

# ============================================================================
# ADDITIONAL ENDPOINTS
# ============================================================================

@router.get("/test")
async def chat_test():
    """Test endpoint to verify chat service"""
    return {
        "message": "Enhanced chat service is working!",
        "timestamp": datetime.utcnow().isoformat(),
        "features": [
            "Direct MCP integration",
            "Real-time market data",
            "Intelligent suggestions",
            "Comprehensive analysis"
        ]
    }

@router.get("/health")
async def chat_health_check():
    """Comprehensive health check"""
    return {
        "status": "healthy",
        "ai_analyzer_available": ai_analyzer.gemini_client is not None or ai_analyzer.gemini_model is not None,
        "ai_api_type": ai_analyzer.api_type,
        "gemini_api_key_configured": bool(os.getenv('GEMINI_API_KEY')),
        "chromadb_available": CHROMA_AVAILABLE,
        "mcp_manager_available": mcp_manager is not None,
        "rate_limit_status": rate_limiter.get_status("default"),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    if CHROMA_AVAILABLE:
        return chroma_cache.get_stats()
    else:
        return {"error": "ChromaDB not available"}

@router.post("/cache/clear")
async def clear_cache():
    """Clear all cached data"""
    try:
        if CHROMA_AVAILABLE:
            chroma_cache.clear_all()
            return {
                "message": "ChromaDB cache cleared successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "error": "ChromaDB not available",
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "error": f"Failed to clear cache: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/tools")
async def get_available_tools():
    """Get available MCP tools"""
    try:
        tools = await mcp_manager.get_mcp_tools()
        return {
            "tools": [{"name": tool.name, "description": tool.description} for tool in tools],
            "count": len(tools),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

# ============================================================================
# CLEANUP
# ============================================================================

@router.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if CHROMA_AVAILABLE:
        chroma_cache.clear_expired(max_age_days=1)
    print("✅ Chat agent shutdown complete")
