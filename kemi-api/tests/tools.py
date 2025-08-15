import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient

async def list_tools():
    """Fetch and list all available tools from CoinGecko MCP endpoints"""
    
    client = MultiServerMCPClient({
        "coingecko": {
            "transport": "sse",
            "url": "https://mcp.api.coingecko.com/sse"
        }
    })

    # Get tools from CoinGecko MCP server
    tools = await client.get_tools()
    print(f"Available {len(tools)} tools from CoinGecko MCP server:")
    print("=" * 40)
    
    for tool in tools:
        print(f"Tool Name: {tool.name} - {tool.description}")
        
async def main():
    """Main function to list all available tools"""
    print("🚀 Fetching available tools from CoinGecko MCP...\n")
    await list_tools()
    print("\n✅ All available tools listed!")

if __name__ == "__main__":
    asyncio.run(main())
