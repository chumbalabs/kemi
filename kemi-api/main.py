from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
import time
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from langchain_mcp_adapters.client import MultiServerMCPClient
import logging
import os
from dotenv import load_dotenv

# Load environment variables from the root .env file
load_dotenv('../.env')

# Debug: Print API key status
gemini_key = os.getenv('GEMINI_API_KEY')
print(f"🔑 Gemini API Key loaded: {'Yes' if gemini_key else 'No'}")
if gemini_key:
    print(f"🔑 Key preview: {gemini_key[:10]}...")

# Import routers
from coin_analysis import router as coin_analysis_router
from chat_agent import router as chat_agent_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
mcp_client = None
cache = {}

# Cache configuration (in seconds) - Very long TTL to minimize API calls
CACHE_TTL = {
    "top_gainers_losers": 600,  # 10 minutes
    "trending": 900,            # 15 minutes
    "global": 900,              # 15 minutes
    "coins_markets": 600,       # 10 minutes
    "market_summary": 600,      # 10 minutes
}

# Request debouncing - prevent multiple simultaneous requests for same data
_active_requests = {}
_request_locks = {}

class CacheManager:
    def __init__(self):
        self.cache = {}
        # Import ChromaDB cache as fallback
        try:
            from chroma_cache import chroma_cache
            self.chroma_cache = chroma_cache
            logger.info("✅ ChromaDB persistent cache initialized")
        except Exception as e:
            logger.warning(f"⚠️ ChromaDB not available: {e}")
            self.chroma_cache = None
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached data if not expired, with ChromaDB fallback"""
        # Try in-memory cache first
        if key in self.cache:
            data, timestamp, ttl = self.cache[key]
            if time.time() - timestamp < ttl:
                logger.info(f"💾 Memory cache hit for key: {key}")
                return data
            else:
                # Don't remove expired cache immediately - keep for fallback
                logger.info(f"⏰ Memory cache expired for key: {key}")
        
        # Try ChromaDB cache as fallback
        if self.chroma_cache:
            chroma_data = self.chroma_cache.get(key, max_age_hours=1)  # 1 hour for fresh data
            if chroma_data:
                # Update in-memory cache with ChromaDB data
                self.set(key, chroma_data, 300)  # Cache for 5 minutes
                return chroma_data
        
        return None
    
    def get_stale(self, key: str) -> Optional[Any]:
        """Get cached data even if expired (for fallback)"""
        # Try in-memory stale cache first
        if key in self.cache:
            data, timestamp, ttl = self.cache[key]
            age = time.time() - timestamp
            logger.info(f"🔄 Using stale memory cache for key: {key} (age: {age:.0f}s)")
            return data
        
        # Try ChromaDB stale cache as ultimate fallback
        if self.chroma_cache:
            stale_data = self.chroma_cache.get_stale(key, max_stale_days=1)  # 1 day max stale
            if stale_data:
                logger.info(f"🔄 Using stale ChromaDB cache for key: {key}")
                return stale_data
        
        return None
    
    def set(self, key: str, data: Any, ttl: int):
        """Set cache with TTL in both memory and ChromaDB"""
        # Set in memory cache
        self.cache[key] = (data, time.time(), ttl)
        logger.info(f"💾 Memory cache set for key: {key} with TTL: {ttl}s")
        
        # Set in ChromaDB for persistence (async to avoid blocking)
        if self.chroma_cache and ttl > 60:  # Only persist data with TTL > 1 minute
            try:
                # Convert Pydantic models to dict for ChromaDB storage
                serializable_data = data
                if hasattr(data, 'dict'):
                    serializable_data = data.dict()
                elif hasattr(data, 'model_dump'):
                    serializable_data = data.model_dump()
                
                self.chroma_cache.set(key, serializable_data)
            except Exception as e:
                logger.warning(f"⚠️ ChromaDB cache set failed for {key}: {e}")
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()
        logger.info("🗑️ Memory cache cleared")
        
        # Optionally clear ChromaDB cache too
        if self.chroma_cache:
            try:
                self.chroma_cache.clear_expired(max_age_days=1)  # Clean old entries
                logger.info("🗑️ ChromaDB cache cleaned")
            except Exception as e:
                logger.warning(f"⚠️ ChromaDB cache clear failed: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics including ChromaDB"""
        current_time = time.time()
        active_keys = []
        expired_keys = []
        
        for key, (data, timestamp, ttl) in self.cache.items():
            if current_time - timestamp < ttl:
                active_keys.append({
                    "key": key,
                    "age": current_time - timestamp,
                    "ttl": ttl,
                    "expires_in": ttl - (current_time - timestamp)
                })
            else:
                expired_keys.append(key)
        
        memory_stats = {
            "total_keys": len(self.cache),
            "active_keys": len(active_keys),
            "expired_keys": len(expired_keys),
            "cache_details": active_keys
        }
        
        # Get ChromaDB stats
        chroma_stats = {}
        if self.chroma_cache:
            try:
                chroma_stats = self.chroma_cache.get_stats()
            except Exception as e:
                chroma_stats = {"error": str(e)}
        
        return {
            "memory_cache": memory_stats,
            "persistent_cache": chroma_stats
        }

async def debounced_request(key: str, request_func):
    """Debounce requests to prevent multiple simultaneous calls for same data"""
    global _active_requests, _request_locks
    
    # Get or create lock for this key
    if key not in _request_locks:
        _request_locks[key] = asyncio.Lock()
    
    async with _request_locks[key]:
        # Check if request is already in progress
        if key in _active_requests:
            logger.info(f"🔄 Waiting for active request: {key}")
            return await _active_requests[key]
        
        # Start new request
        logger.info(f"🚀 Starting new request: {key}")
        task = asyncio.create_task(request_func())
        _active_requests[key] = task
        
        try:
            result = await task
            return result
        finally:
            # Clean up
            if key in _active_requests:
                del _active_requests[key]

# Initialize cache manager
cache_manager = CacheManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Kemi Crypto API...")
    global mcp_client
    mcp_client = MultiServerMCPClient({
        "coingecko": {
            "transport": "sse",
            "url": "https://mcp.api.coingecko.com/sse"
        }
    })
    logger.info("MCP client initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Kemi Crypto API...")
    cache_manager.clear()
    
    # Clean up MCP manager
    try:
        from mcp_manager import mcp_manager
        await mcp_manager.cleanup()
    except Exception as e:
        logger.error(f"Error during MCP cleanup: {e}")
    
    logger.info("Kemi Crypto API shutdown complete")

app = FastAPI(
    title="Kemi Crypto API", 
    version="1.0.0",
    lifespan=lifespan
)

# Include routers
app.include_router(coin_analysis_router)
app.include_router(chat_agent_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://kemicrypto.icu",
        "https://kemicrypto.icu",
        "https://kemi-frontend-uuql.onrender.com",
        "https://kemi-frontend.onrender.com",
        "https://kemi-iqae.onrender.com"
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global MCP client
mcp_client = None

# Response models
class CoinGainer(BaseModel):
    id: str
    symbol: str
    name: str
    image: str
    market_cap_rank: int
    usd: float
    usd_24h_vol: float
    usd_24h_change: float

class TrendingCoin(BaseModel):
    id: str
    name: str
    symbol: str
    market_cap_rank: Optional[int] = None
    price_btc: float
    thumb: Optional[str] = None
    large: Optional[str] = None

class MarketCoin(BaseModel):
    id: str
    symbol: str
    name: str
    image: str
    current_price: float
    market_cap: Optional[float]
    market_cap_rank: Optional[int]
    price_change_percentage_24h: Optional[float]
    price_change_percentage_1h_in_currency: Optional[float]
    price_change_percentage_7d_in_currency: Optional[float]
    total_volume: Optional[float]

class GlobalMarketData(BaseModel):
    total_market_cap_usd: float
    total_volume_usd: float
    market_cap_change_percentage_24h_usd: float
    active_cryptocurrencies: int
    markets: int

class TopGainersResponse(BaseModel):
    top_gainers: List[CoinGainer]
    top_losers: List[CoinGainer]

class TrendingResponse(BaseModel):
    coins: List[Dict[str, TrendingCoin]]

class MarketSummaryResponse(BaseModel):
    global_data: GlobalMarketData
    trending_coins: List[Dict[str, TrendingCoin]]
    top_gainers: List[CoinGainer]

async def get_mcp_client():
    """Get MCP client"""
    global mcp_client
    if mcp_client is None:
        raise HTTPException(status_code=500, detail="MCP client not initialized")
    return mcp_client

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Kemi Crypto API is running", "status": "healthy"}

@app.get("/api/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    return cache_manager.get_stats()

@app.post("/api/cache/clear")
async def clear_cache():
    """Clear all cache"""
    cache_manager.clear()
    return {"message": "Cache cleared successfully"}

@app.get("/api/health")
async def health_check():
    """Detailed health check with cache stats"""
    try:
        client = await get_mcp_client()
        cache_stats = cache_manager.get_stats()
        
        return {
            "status": "healthy",
            "mcp_client": "connected" if client else "disconnected",
            "cache": cache_stats,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }

@app.get("/api/top-gainers-losers", response_model=TopGainersResponse)
async def get_top_gainers_losers(
    vs_currency: str = "usd",
    duration: str = "24h",
    top_coins: str = "1000"
):
    """Get top gainers and losers - raw data from CoinGecko MCP with caching"""
    cache_key = f"top_gainers_losers_{vs_currency}_{duration}_{top_coins}"
    
    # Try cache first
    cached_data = cache_manager.get(cache_key)
    if cached_data:
        return cached_data
    
    async def fetch_data():
        try:
            from mcp_manager import mcp_manager
            
            # Use the rate-limited MCP manager
            data = await mcp_manager.get_top_gainers_losers(vs_currency, duration, top_coins)
            
            if data:
                # Create response
                response = TopGainersResponse(
                    top_gainers=[CoinGainer(**gainer) for gainer in data.get('top_gainers', [])],
                    top_losers=[CoinGainer(**loser) for loser in data.get('top_losers', [])]
                )
                
                # Cache the response
                cache_manager.set(cache_key, response, CACHE_TTL["top_gainers_losers"])
                
                return response
            else:
                # Try stale cache as fallback
                stale_data = cache_manager.get_stale(cache_key)
                if stale_data:
                    return stale_data
                
                # Return empty response if no cache available
                response = TopGainersResponse(top_gainers=[], top_losers=[])
                cache_manager.set(cache_key, response, 60)  # Cache for 1 minute
                return response
                
        except Exception as e:
            logger.error(f"Error fetching top gainers/losers: {e}")
            
            # Try stale cache as fallback
            stale_data = cache_manager.get_stale(cache_key)
            if stale_data:
                return stale_data
            
            # Return empty response instead of error
            response = TopGainersResponse(top_gainers=[], top_losers=[])
            return response
    
    return await debounced_request(cache_key, fetch_data)

@app.get("/api/trending", response_model=TrendingResponse)
async def get_trending_coins():
    """Get trending coins from CoinGecko MCP with caching"""
    cache_key = "trending_coins"
    
    # Try cache first
    cached_data = cache_manager.get(cache_key)
    if cached_data:
        return cached_data
    
    async def fetch_data():
        try:
            from mcp_manager import mcp_manager
            
            # Use the rate-limited MCP manager
            data = await mcp_manager.get_trending_coins()
            
            if data:
                # Transform to match frontend expectations
                trending_coins = []
                for coin_data in data.get('coins', []):
                    item = coin_data.get('item', {})
                    trending_coins.append({
                        "item": TrendingCoin(
                            id=item.get('id', ''),
                            name=item.get('name', ''),
                            symbol=item.get('symbol', ''),
                            market_cap_rank=item.get('market_cap_rank') or 0,  # Default to 0 if None
                            price_btc=item.get('price_btc', 0.0),
                            thumb=item.get('thumb'),
                            large=item.get('large')
                        )
                    })
                
                response = TrendingResponse(coins=trending_coins)
                
                # Cache the response
                cache_manager.set(cache_key, response, CACHE_TTL["trending"])
                
                return response
            else:
                # Try stale cache as fallback
                stale_data = cache_manager.get_stale(cache_key)
                if stale_data:
                    return stale_data
                
                # Return empty response if MCP fails
                response = TrendingResponse(coins=[])
                cache_manager.set(cache_key, response, 60)  # Cache for 1 minute
                return response
                
        except Exception as e:
            logger.error(f"Error fetching trending coins: {e}")
            
            # Try stale cache as fallback
            stale_data = cache_manager.get_stale(cache_key)
            if stale_data:
                return stale_data
            
            # Return empty response instead of error
            response = TrendingResponse(coins=[])
            return response
    
    return await debounced_request(cache_key, fetch_data)

@app.get("/api/global", response_model=GlobalMarketData)
async def get_global_market_data():
    """Get global market data from CoinGecko MCP with caching"""
    cache_key = "global_market_data"
    
    # Try cache first
    cached_data = cache_manager.get(cache_key)
    if cached_data:
        return cached_data
    
    async def fetch_data():
        try:
            from mcp_manager import mcp_manager
            
            # Use the rate-limited MCP manager
            data = await mcp_manager.get_global_data()
            
            if data:
                global_data = data.get('data', {})
                
                response = GlobalMarketData(
                    total_market_cap_usd=global_data.get('total_market_cap', {}).get('usd', 0),
                    total_volume_usd=global_data.get('total_volume', {}).get('usd', 0),
                    market_cap_change_percentage_24h_usd=global_data.get('market_cap_change_percentage_24h_usd', 0),
                    active_cryptocurrencies=global_data.get('active_cryptocurrencies', 0),
                    markets=global_data.get('markets', 0)
                )
                
                # Cache the response
                cache_manager.set(cache_key, response, CACHE_TTL["global"])
                
                return response
            else:
                # Try stale cache as fallback
                stale_data = cache_manager.get_stale(cache_key)
                if stale_data:
                    return stale_data
                
                # Return default response if MCP fails
                response = GlobalMarketData(
                    total_market_cap_usd=0,
                    total_volume_usd=0,
                    market_cap_change_percentage_24h_usd=0,
                    active_cryptocurrencies=0,
                    markets=0
                )
                cache_manager.set(cache_key, response, 60)  # Cache for 1 minute
                return response
                
        except Exception as e:
            logger.error(f"Error fetching global market data: {e}")
            
            # Try stale cache as fallback
            stale_data = cache_manager.get_stale(cache_key)
            if stale_data:
                return stale_data
            
            # Return default response instead of error
            response = GlobalMarketData(
                total_market_cap_usd=0,
                total_volume_usd=0,
                market_cap_change_percentage_24h_usd=0,
                active_cryptocurrencies=0,
                markets=0
            )
            return response
    
    return await debounced_request(cache_key, fetch_data)

@app.get("/api/coins/markets")
async def get_coins_markets(
    vs_currency: str = "usd",
    order: str = "market_cap_desc",
    per_page: int = 100,
    page: int = 1,
    price_change_percentage: str = "1h,24h,7d"
):
    """Get coins market data from CoinGecko MCP with caching"""
    cache_key = f"coins_markets_{vs_currency}_{order}_{per_page}_{page}_{price_change_percentage}"
    
    # Try cache first
    cached_data = cache_manager.get(cache_key)
    if cached_data:
        return cached_data
    
    try:
        from mcp_manager import mcp_manager
        
        # Use the rate-limited MCP manager
        data = await mcp_manager.get_coins_markets({
            "vs_currency": vs_currency,
            "order": order,
            "per_page": per_page,
            "page": page,
            "sparkline": False,
            "price_change_percentage": price_change_percentage
        })
        
        if data:
            # Cache the response
            cache_manager.set(cache_key, data, CACHE_TTL["coins_markets"])
            
            # Return raw data as-is for maximum compatibility
            return data
        else:
            # Return empty list if MCP fails
            empty_data = []
            cache_manager.set(cache_key, empty_data, 60)  # Cache for 1 minute
            return empty_data
            
    except Exception as e:
        logger.error(f"Error fetching coins markets: {e}")
        # Return empty list instead of error
        return []

@app.get("/api/market-summary", response_model=MarketSummaryResponse)
async def get_market_summary():
    """Get comprehensive market summary combining multiple endpoints with caching"""
    cache_key = "market_summary"
    
    # Try cache first
    cached_data = cache_manager.get(cache_key)
    if cached_data:
        return cached_data
    
    try:
        # Fetch data sequentially to avoid overwhelming the API
        logger.info("🔄 Fetching market summary data sequentially...")
        
        global_data = await get_global_market_data()
        await asyncio.sleep(1)  # Small delay between requests
        
        trending_data = await get_trending_coins()
        await asyncio.sleep(1)  # Small delay between requests
        
        gainers_data = await get_top_gainers_losers()
        
        response = MarketSummaryResponse(
            global_data=global_data,
            trending_coins=trending_data.coins,
            top_gainers=gainers_data.top_gainers[:10]  # Limit to top 10
        )
        
        # Cache the response
        cache_manager.set(cache_key, response, CACHE_TTL["market_summary"])
        logger.info("✅ Market summary cached successfully")
        
        return response
        
    except Exception as e:
        logger.error(f"Error fetching market summary: {e}")
        # Return empty response instead of error to prevent frontend crashes
        empty_response = MarketSummaryResponse(
            global_data=GlobalMarketData(
                total_market_cap_usd=0,
                total_volume_usd=0,
                market_cap_change_percentage_24h_usd=0,
                active_cryptocurrencies=0,
                markets=0
            ),
            trending_coins=[],
            top_gainers=[]
        )
        # Cache empty response for shorter time
        cache_manager.set(cache_key, empty_response, 60)
        return empty_response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
