import asyncio
from mcp_manager import mcp_manager

async def test_bitcoin_data():
    try:
        result = await mcp_manager.get_coin_data('bitcoin')
        if result:
            market_data = result.get('market_data', {})
            current_price = market_data.get('current_price', {}).get('usd', 0)
            price_change = market_data.get('price_change_percentage_24h', 0)
            print(f'✅ Bitcoin price: ${current_price:,.2f}')
            print(f'✅ 24h change: {price_change:+.2f}%')
            print(f'✅ Market cap rank: #{result.get("market_cap_rank", "N/A")}')
            print(f'✅ Name: {result.get("name", "Unknown")}')
            print(f'✅ Symbol: {result.get("symbol", "Unknown")}')
        else:
            print('❌ No Bitcoin data returned')
    except Exception as e:
        print(f'❌ Error: {e}')

if __name__ == "__main__":
    asyncio.run(test_bitcoin_data())