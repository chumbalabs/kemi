import asyncio
import json
from langchain_mcp_adapters.client import MultiServerMCPClient

async def test_mcp_fixed():
    client = MultiServerMCPClient({
        'coingecko': {
            'transport': 'sse',
            'url': 'https://mcp.api.coingecko.com/sse'
        }
    })
    
    try:
        # Test calling a simple tool with proper parsing
        async with client.session('coingecko') as session:
            result = await session.call_tool('get_global', {})
            print(f'Raw result type: {type(result)}')
            
            # Parse the MCP result properly
            if result and hasattr(result, 'content') and result.content:
                text_content = result.content[0].text if result.content else None
                if text_content:
                    try:
                        parsed_data = json.loads(text_content)
                        print(f'Parsed data type: {type(parsed_data)}')
                        if 'data' in parsed_data:
                            market_data = parsed_data['data']
                            total_cap = market_data.get('total_market_cap', {}).get('usd', 'Not found')
                            btc_dominance = market_data.get('market_cap_percentage', {}).get('btc', 'Not found')
                            print(f'✅ Market cap: ${total_cap:,.0f}')
                            print(f'✅ Bitcoin dominance: {btc_dominance:.1f}%')
                        else:
                            print(f'Keys in parsed data: {list(parsed_data.keys())}')
                    except json.JSONDecodeError as e:
                        print(f'JSON parse error: {e}')
                        print(f'Raw content: {text_content[:200]}...')
            else:
                print('No content in result')
                
        # Test trending coins
        async with client.session('coingecko') as session:
            result = await session.call_tool('get_search_trending', {})
            if result and hasattr(result, 'content') and result.content:
                text_content = result.content[0].text if result.content else None
                if text_content:
                    try:
                        parsed_data = json.loads(text_content)
                        if 'coins' in parsed_data:
                            trending_coins = parsed_data['coins'][:3]
                            print(f'✅ Top 3 trending coins:')
                            for i, coin in enumerate(trending_coins, 1):
                                coin_data = coin.get('item', {})
                                name = coin_data.get('name', 'Unknown')
                                symbol = coin_data.get('symbol', 'N/A')
                                rank = coin_data.get('market_cap_rank', 'N/A')
                                print(f'  {i}. {name} ({symbol.upper()}) - Rank #{rank}')
                    except json.JSONDecodeError as e:
                        print(f'Trending coins JSON parse error: {e}')
                        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_mcp_fixed())