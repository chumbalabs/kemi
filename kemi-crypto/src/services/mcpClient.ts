/**
 * MCP Client for CoinGecko Integration
 * Based on the official MCP TypeScript SDK
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface MCPClientConfig {
  serverCommand: string;
  serverArgs: string[];
}

class MCPCoingeckoClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;

  constructor(private config: MCPClientConfig) {}

  async connect(): Promise<boolean> {
    try {
      // Create transport
      this.transport = new StdioClientTransport({
        command: this.config.serverCommand,
        args: this.config.serverArgs,
      });

      // Create client
      this.client = new Client(
        {
          name: "kemi-crypto-dashboard",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
            resources: {},
          },
        }
      );

      // Connect to server
      await this.client.connect(this.transport);
      this.isConnected = true;
      
      console.log('✅ MCP CoinGecko client connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect MCP client:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.isConnected = false;
  }

  async callTool(name: string, arguments_: Record<string, any>): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.callTool({
        name,
        arguments: arguments_,
      });
      return result;
    } catch (error) {
      console.error(`❌ MCP tool call failed for ${name}:`, error);
      throw error;
    }
  }

  async listTools(): Promise<any[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.listTools();
      return result.tools;
    } catch (error) {
      console.error('❌ Failed to list MCP tools:', error);
      throw error;
    }
  }

  async getResource(uri: string): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client.readResource({ uri });
      return result;
    } catch (error) {
      console.error(`❌ Failed to get MCP resource ${uri}:`, error);
      throw error;
    }
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
const mcpClient = new MCPCoingeckoClient({
  serverCommand: 'uvx',
  serverArgs: ['mcp-server-coingecko'],
});

export default mcpClient;
export { MCPCoingeckoClient };