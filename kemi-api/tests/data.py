import asyncio
import json
from langchain_mcp_adapters.client import MultiServerMCPClient

async def get_raw_data():
    """Fetch raw data from CoinGecko MCP endpoints"""
    
    client = MultiServerMCPClient({
        "coingecko": {
            "transport": "sse",
            "url": "https://mcp.api.coingecko.com/sse"
        }
    })

    # Get tools from CoinGecko MCP server
    tools = await client.get_tools()
    print(f"Available {len(tools)} tools from CoinGecko MCP server\n")
    
    # Create a session to use the tools directly
    async with client.session("coingecko") as session:
        
        # Example 1: Get top gainers/losers (24h)
        print("🔥 Top Gainers/Losers (24h):")
        print("=" * 40)
        try:
            result = await session.call_tool("get_coins_top_gainers_losers", {
                "vs_currency": "usd",
                "duration": "24h",
                "top_coins": "300"
            })
            
            # Save raw data to file
            with open("gainers_losers_24h.json", "w") as f:
                json.dump(result.content[0].text, f, indent=2)
            
            print("✅ Data saved to: gainers_losers_24h.json")
            
            # Show a preview
            data = json.loads(result.content[0].text)
            print(f"📊 Found {len(data['top_gainers'])} gainers and {len(data['top_losers'])} losers")
            print(f"🚀 Top gainer: {data['top_gainers'][0]['name']} (+{data['top_gainers'][0]['usd_24h_change']:.2f}%)")
            print(f"📉 Top loser: {data['top_losers'][0]['name']} ({data['top_losers'][0]['usd_24h_change']:.2f}%)")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("\n" + "-" * 50 + "\n")
        
        # Example 2: Get current market data for top coins
        print("💰 Top Cryptocurrencies by Market Cap:")
        print("=" * 40)
        try:
            result = await session.call_tool("get_coins_markets", {
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 10,
                "page": 1,
                "sparkline": False,
                "price_change_percentage": "24h,7d"
            })
            
            # Save raw data to file
            with open("top_coins_market_data.json", "w") as f:
                json.dump(result.content[0].text, f, indent=2)
            
            print("✅ Data saved to: top_coins_market_data.json")
            
            # Show a preview
            data = json.loads(result.content[0].text)
            print(f"📊 Retrieved data for {len(data)} coins")
            for i, coin in enumerate(data[:5], 1):
                print(f"{i}. {coin['name']} (${coin['current_price']:.2f}) - 24h: {coin.get('price_change_percentage_24h', 0):.2f}%")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("\n" + "-" * 50 + "\n")
        
        # Example 3: Get trending coins
        print("🔥 Trending Coins:")
        print("=" * 40)
        try:
            result = await session.call_tool("get_search_trending", {})
            
            # Save raw data to file
            with open("trending_coins.json", "w") as f:
                json.dump(result.content[0].text, f, indent=2)
            
            print("✅ Data saved to: trending_coins.json")
            
            # Show a preview
            data = json.loads(result.content[0].text)
            print(f"📊 Found {len(data['coins'])} trending coins")
            for i, coin in enumerate(data['coins'][:5], 1):
                print(f"{i}. {coin['item']['name']} ({coin['item']['symbol']}) - Rank: #{coin['item']['market_cap_rank']}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("\n" + "-" * 50 + "\n")
        
        # Example 4: Get global crypto market data
        print("🌍 Global Market Data:")
        print("=" * 40)
        try:
            result = await session.call_tool("get_global", {})
            
            # Save raw data to file
            with open("global_market_data.json", "w") as f:
                json.dump(result.content[0].text, f, indent=2)
            
            print("✅ Data saved to: global_market_data.json")
            
            # Show a preview
            data = json.loads(result.content[0].text)['data']
            print(f"💰 Total Market Cap: ${data['total_market_cap']['usd']:,.0f}")
            print(f"📊 Total Volume (24h): ${data['total_volume']['usd']:,.0f}")
            print(f"🪙 Active Cryptocurrencies: {data['active_cryptocurrencies']}")
            print(f"🏪 Markets: {data['markets']}")
            
        except Exception as e:
            print(f"❌ Error: {e}")

async def main():
    """Main function to fetch all raw data"""
    print("🚀 Fetching raw cryptocurrency data from CoinGecko MCP...\n")
    await get_raw_data()
    print("\n✅ All data fetched and saved to JSON files!")
    print("📁 Files created:")
    print("   - gainers_losers_24h.json")
    print("   - top_coins_market_data.json") 
    print("   - trending_coins.json")
    print("   - global_market_data.json")

if __name__ == "__main__":
    asyncio.run(main())
