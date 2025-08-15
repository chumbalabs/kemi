import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient

async def test_mcp():
    client = MultiServerMCPClient({
        'coingecko': {
            'transport': 'sse',
            'url': 'https://mcp.api.coingecko.com/sse'
        }
    })
    
    try:
        # Test getting tools
        tools = await client.get_tools()
        print(f'Available tools: {len(tools)}')
        
        # Test calling a simple tool
        async with client.session('coingecko') as session:
            result = await session.call_tool('get_global', {})
            print(f'Global data result type: {type(result)}')
            if result:
                if isinstance(result, dict):
                    print(f'Keys in result: {list(result.keys())}')
                    if 'data' in result:
                        market_data = result['data']
                        total_cap = market_data.get('total_market_cap', {}).get('usd', 'Not found')
                        print(f'Market cap: {total_cap}')
                    else:
                        print(f'Result content: {str(result)[:200]}...')
                else:
                    print(f'Result content: {str(result)[:200]}...')
            else:
                print('Result is None or empty')
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_mcp())