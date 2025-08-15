import asyncio
from mcp_manager import mcp_manager

async def test_coins_list():
    try:
        # Test get_coins_list tool
        result = await mcp_manager.call_tool_with_retry('get_coins_list', {})
        if result:
            print(f'✅ Found {len(result)} coins')
            # Show first 10 coins
            for i, coin in enumerate(result[:10]):
                name = coin.get('name', 'Unknown')
                symbol = coin.get('symbol', 'N/A').upper()
                coin_id = coin.get('id', 'N/A')
                print(f'{i+1}. {name} ({symbol}) - ID: {coin_id}')
        else:
            print('❌ No coins data returned')
    except Exception as e:
        print(f'❌ Error: {e}')

if __name__ == "__main__":
    asyncio.run(test_coins_list())