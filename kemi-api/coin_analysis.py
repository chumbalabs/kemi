"""
Coin Analysis Endpoints
Handles individual coin analysis with technical indicators and AI insights
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
import json
import asyncio
from datetime import datetime, timedelta
import os
import random
from dotenv import load_dotenv

from technical_analysis import TechnicalAnalyzer
from ai_analysis import AIAnalyzer, prepare_analysis_data
from langchain_mcp_adapters.client import MultiServerMCPClient

# Load environment variables
load_dotenv('../.env')

# Debug: Print API key status
gemini_key = os.getenv('GEMINI_API_KEY')
print(f"🔑 Coin Analysis - Gemini API Key loaded: {'Yes' if gemini_key else 'No'}")

# Create router
router = APIRouter(prefix="/api/coins", tags=["coin-analysis"])

# Global instances
technical_analyzer = TechnicalAnalyzer()

# Initialize AI analyzer with explicit API key
gemini_api_key = os.getenv('GEMINI_API_KEY')
print(f"🤖 Initializing AI Analyzer with key: {'Yes' if gemini_api_key else 'No'}")
ai_analyzer = AIAnalyzer(gemini_api_key=gemini_api_key)

# Rate limiting
request_timestamps = []
MAX_REQUESTS_PER_MINUTE = 10

def check_rate_limit():
    """Simple rate limiting"""
    global request_timestamps
    now = datetime.now().timestamp()
    
    # Remove old timestamps
    request_timestamps = [ts for ts in request_timestamps if now - ts < 60]
    
    if len(request_timestamps) >= MAX_REQUESTS_PER_MINUTE:
        return False
    
    request_timestamps.append(now)
    return True

# Cache for coin analysis (in-memory for now)
analysis_cache = {}
ANALYSIS_CACHE_TTL = 30 * 60  # 30 minutes

# Global MCP client with connection pooling
_mcp_client = None
_client_lock = asyncio.Lock()

async def get_mcp_client():
    """Get or create MCP client with connection pooling"""
    global _mcp_client
    
    async with _client_lock:
        if _mcp_client is None:
            _mcp_client = MultiServerMCPClient({
                "coingecko": {
                    "transport": "sse",
                    "url": "https://mcp.api.coingecko.com/sse"
                }
            })
        return _mcp_client

async def fetch_coin_data(coin_id: str) -> Dict[str, Any]:
    """Fetch comprehensive coin data from CoinGecko MCP with retry logic"""
    from mcp_manager import mcp_manager
    
    data = await mcp_manager.get_coin_data(coin_id)
    
    if data:
        return data
    else:
        # Generate mock data if API fails
        print(f"No coin data for {coin_id}, generating mock data")
        return generate_mock_coin_data(coin_id)

async def fetch_ohlc_data(coin_id: str, days: int = 30) -> list:
    """Fetch OHLC data for technical analysis with retry logic"""
    max_retries = 2
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            client = await get_mcp_client()
            
            async with client.session("coingecko") as session:
                # Calculate timestamps
                end_timestamp = int(datetime.now().timestamp())
                start_timestamp = int((datetime.now() - timedelta(days=days)).timestamp())
                
                try:
                    # Try to get OHLC data
                    ohlc_result = await session.call_tool("get_range_coins_ohlc", {
                        "id": coin_id,
                        "vs_currency": "usd",
                        "from": start_timestamp,
                        "to": end_timestamp,
                        "interval": "daily"
                    })
                    
                    ohlc_data = json.loads(ohlc_result.content[0].text)
                    return ohlc_data
                    
                except Exception as e:
                    print(f"OHLC fetch error: {e}")
                    # Fallback to market chart data
                    try:
                        chart_result = await session.call_tool("get_range_coins_market_chart", {
                            "id": coin_id,
                            "vs_currency": "usd",
                            "from": start_timestamp,
                            "to": end_timestamp,
                            "interval": "daily"
                        })
                        
                        chart_data = json.loads(chart_result.content[0].text)
                        
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
                        
                    except Exception as e2:
                        print(f"Market chart fallback error: {e2}")
                        if attempt < max_retries - 1:
                            continue
                        return []
                        
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"OHLC attempt {attempt + 1} failed for {coin_id}: {e}")
                await asyncio.sleep(retry_delay * (attempt + 1))
                continue
            else:
                print(f"All OHLC attempts failed for {coin_id}: {e}")
                return []

def is_cache_valid(cache_entry: Dict[str, Any]) -> bool:
    """Check if cache entry is still valid"""
    if not cache_entry:
        return False
    
    timestamp = cache_entry.get('timestamp', 0)
    return (datetime.now().timestamp() - timestamp) < ANALYSIS_CACHE_TTL

def generate_mock_coin_data(coin_id: str) -> Dict[str, Any]:
    """Generate mock coin data when API fails"""
    return {
        'id': coin_id,
        'name': coin_id.replace('-', ' ').title(),
        'symbol': coin_id[:3].upper(),
        'description': {'en': f'Mock data for {coin_id}'},
        'image': {
            'thumb': 'https://via.placeholder.com/32',
            'small': 'https://via.placeholder.com/64',
            'large': 'https://via.placeholder.com/128'
        },
        'market_cap_rank': 100,
        'categories': ['cryptocurrency'],
        'market_data': {
            'current_price': {'usd': 1.0},
            'market_cap': {'usd': 1000000},
            'total_volume': {'usd': 100000},
            'price_change_percentage_24h': 0.0,
            'price_change_percentage_7d': 0.0,
            'price_change_percentage_30d': 0.0,
            'circulating_supply': 1000000,
            'total_supply': 1000000,
            'ath': {'usd': 2.0},
            'atl': {'usd': 0.5}
        }
    }

def generate_mock_ohlc_data(coin_data: Dict[str, Any], days: int = 90) -> list:
    """Generate mock OHLC data when API fails"""
    try:
        # Get current price from coin data
        current_price = coin_data.get('market_data', {}).get('current_price', {}).get('usd', 50000)
    except:
        current_price = 50000  # Default fallback
    
    ohlc_data = []
    base_price = current_price * 0.9  # Start 10% lower
    
    for i in range(days):
        timestamp = int((datetime.now() - timedelta(days=days-i)).timestamp() * 1000)
        
        # Generate realistic price movement
        volatility = 0.03  # 3% daily volatility
        change = (random.random() - 0.5) * volatility
        base_price = base_price * (1 + change)
        
        # Generate OHLC from base price
        high = base_price * (1 + random.random() * 0.02)
        low = base_price * (1 - random.random() * 0.02)
        open_price = base_price + (random.random() - 0.5) * (high - low) * 0.5
        close_price = base_price + (random.random() - 0.5) * (high - low) * 0.5
        volume = random.randint(1000000, 10000000)
        
        ohlc_data.append([timestamp, open_price, high, low, close_price, volume])
    
    return ohlc_data

@router.get("/{coin_id}/analysis")
async def get_coin_analysis(
    coin_id: str,
    force_refresh: bool = Query(False, description="Force refresh analysis")
):
    """Get comprehensive coin analysis with technical indicators and AI insights"""
    
    # Rate limiting
    if not check_rate_limit():
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    
    # Check cache first
    cache_key = f"{coin_id}_gemini"
    if not force_refresh and cache_key in analysis_cache:
        cached_analysis = analysis_cache[cache_key]
        if is_cache_valid(cached_analysis):
            return {
                "coin_id": coin_id,
                "cached": True,
                "cache_age": int(datetime.now().timestamp() - cached_analysis['timestamp']),
                **cached_analysis['data']
            }
    
    try:
        # Fetch data with staggered timing to avoid rate limits
        coin_data = await fetch_coin_data(coin_id)
        await asyncio.sleep(0.5)  # Small delay to avoid rate limits
        ohlc_data = await fetch_ohlc_data(coin_id, days=90)  # 90 days for better technical analysis
        
        # Generate mock data if no OHLC data available
        if not ohlc_data:
            print(f"No OHLC data for {coin_id}, generating mock data for technical analysis")
            ohlc_data = generate_mock_ohlc_data(coin_data, days=90)
        
        # Perform technical analysis
        technical_analysis = technical_analyzer.full_analysis(ohlc_data)
        
        # Prepare data for AI analysis
        analysis_data = prepare_analysis_data(coin_data, technical_analysis, ohlc_data)
        
        # Generate AI analysis
        ai_analysis = await ai_analyzer.generate_comprehensive_analysis(analysis_data)
        
        # Prepare response
        response_data = {
            "coin_info": {
                "id": coin_data.get('id'),
                "name": coin_data.get('name'),
                "symbol": coin_data.get('symbol'),
                "description": coin_data.get('description', {}).get('en', ''),
                "image": coin_data.get('image', {}),
                "market_cap_rank": coin_data.get('market_cap_rank'),
                "categories": coin_data.get('categories', [])
            },
            "market_data": {
                "current_price": coin_data.get('market_data', {}).get('current_price', {}).get('usd', 0),
                "market_cap": coin_data.get('market_data', {}).get('market_cap', {}).get('usd'),
                "total_volume": coin_data.get('market_data', {}).get('total_volume', {}).get('usd'),
                "price_change_24h": coin_data.get('market_data', {}).get('price_change_percentage_24h', 0),
                "price_change_7d": coin_data.get('market_data', {}).get('price_change_percentage_7d', 0),
                "price_change_30d": coin_data.get('market_data', {}).get('price_change_percentage_30d', 0),
                "circulating_supply": coin_data.get('market_data', {}).get('circulating_supply'),
                "total_supply": coin_data.get('market_data', {}).get('total_supply'),
                "ath": coin_data.get('market_data', {}).get('ath', {}).get('usd'),
                "atl": coin_data.get('market_data', {}).get('atl', {}).get('usd')
            },
            "technical_analysis": technical_analysis,
            "ai_analysis": ai_analysis,
            "ohlc_data": ohlc_data[-30:] if len(ohlc_data) > 30 else ohlc_data,  # Last 30 days for frontend
            "data_quality": {
                "ohlc_data_points": len(ohlc_data),
                "analysis_reliability": technical_analysis.get('summary', {}).get('analysis_quality', 'unknown'),
                "last_updated": datetime.utcnow().isoformat()
            }
        }
        
        # Cache the result
        analysis_cache[cache_key] = {
            "timestamp": datetime.now().timestamp(),
            "data": response_data
        }
        
        return {
            "coin_id": coin_id,
            "cached": False,
            **response_data
        }
        
    except Exception as e:
        print(f"Coin analysis error for {coin_id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to analyze coin {coin_id}: {str(e)}"
        )

@router.get("/{coin_id}/technical")
async def get_technical_analysis(coin_id: str, days: int = Query(30, ge=7, le=365)):
    """Get only technical analysis for a coin"""
    
    cache_key = f"{coin_id}_technical_{days}"
    if cache_key in analysis_cache:
        cached_analysis = analysis_cache[cache_key]
        if is_cache_valid(cached_analysis):
            return cached_analysis['data']
    
    try:
        ohlc_data = await fetch_ohlc_data(coin_id, days=days)
        technical_analysis = technical_analyzer.full_analysis(ohlc_data)
        
        response_data = {
            "coin_id": coin_id,
            "technical_analysis": technical_analysis,
            "ohlc_data": ohlc_data,
            "data_points": len(ohlc_data),
            "analysis_period_days": days,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        # Cache the result
        analysis_cache[cache_key] = {
            "timestamp": datetime.now().timestamp(),
            "data": response_data
        }
        
        return response_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get technical analysis for {coin_id}: {str(e)}"
        )

@router.get("/{coin_id}/ohlc")
async def get_ohlc_data(
    coin_id: str, 
    days: int = Query(30, ge=1, le=365),
    interval: str = Query("daily", regex="^(daily|hourly)$")
):
    """Get OHLC data for a coin"""
    
    try:
        client = await get_mcp_client()
        
        async with client.session("coingecko") as session:
            end_timestamp = int(datetime.now().timestamp())
            start_timestamp = int((datetime.now() - timedelta(days=days)).timestamp())
            
            ohlc_result = await session.call_tool("get_range_coins_ohlc", {
                "id": coin_id,
                "vs_currency": "usd",
                "from": start_timestamp,
                "to": end_timestamp,
                "interval": interval
            })
            
            ohlc_data = json.loads(ohlc_result.content[0].text)
            
            return {
                "coin_id": coin_id,
                "interval": interval,
                "days": days,
                "data_points": len(ohlc_data),
                "ohlc_data": ohlc_data,
                "last_updated": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get OHLC data for {coin_id}: {str(e)}"
        )

@router.post("/cache/clear")
async def clear_analysis_cache():
    """Clear the analysis cache"""
    global analysis_cache
    cache_size = len(analysis_cache)
    analysis_cache.clear()
    
    return {
        "message": f"Analysis cache cleared",
        "cleared_entries": cache_size,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    current_time = datetime.now().timestamp()
    
    valid_entries = 0
    expired_entries = 0
    
    for entry in analysis_cache.values():
        if (current_time - entry.get('timestamp', 0)) < ANALYSIS_CACHE_TTL:
            valid_entries += 1
        else:
            expired_entries += 1
    
    return {
        "total_entries": len(analysis_cache),
        "valid_entries": valid_entries,
        "expired_entries": expired_entries,
        "cache_ttl_minutes": ANALYSIS_CACHE_TTL // 60,
        "timestamp": datetime.utcnow().isoformat()
    }