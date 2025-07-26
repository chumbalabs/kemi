/**
 * MCP CoinGecko Service
 * Provides a clean interface to CoinGecko MCP tools with proper error handling and caching
 */

import cacheService from './cacheService';


// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
    TRENDING: 5 * 60 * 1000,      // 5 minutes
    MARKETS: 2 * 60 * 1000,       // 2 minutes
    GLOBAL: 5 * 60 * 1000,        // 5 minutes
    GAINERS: 2 * 60 * 1000,       // 2 minutes
    CHART: 1 * 60 * 1000,         // 1 minute
} as const;

// Types for MCP responses
export interface MCPCoin {
    id: string;
    symbol: string;
    name: string;
    image?: string;
    current_price?: number;
    market_cap?: number;
    market_cap_rank?: number;
    price_change_percentage_24h?: number;
    price_change_percentage_1h_in_currency?: number;
    price_change_percentage_7d_in_currency?: number;
    total_volume?: number;
}

export interface MCPGlobalData {
    data: {
        total_market_cap?: { [key: string]: number };
        total_volume?: { [key: string]: number };
        market_cap_percentage?: { [key: string]: number };
        market_cap_change_percentage_24h_usd?: number;
        active_cryptocurrencies?: number;
        markets?: number;
    };
}

export interface MCPTrendingResult {
    coins: Array<{ item: any }>;
}

export interface MCPTopGainersLosers {
    top_gainers: Array<{
        id: string;
        symbol: string;
        name: string;
        image: string;
        market_cap_rank: number;
        usd: number;
        usd_24h_vol: number;
        usd_24h_change: number;
    }>;
    top_losers: Array<{
        id: string;
        symbol: string;
        name: string;
        image: string;
        market_cap_rank: number;
        usd: number;
        usd_24h_vol: number;
        usd_24h_change: number;
    }>;
}

class MCPCoingeckoService {
    private isAvailable = false;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        try {
            // Check if MCP is available in the window object
            this.isAvailable = typeof window !== 'undefined' && !!window.mcpCoingecko;
            if (this.isAvailable) {
                console.log('✅ MCP CoinGecko service initialized successfully');
            } else {
                console.warn('⚠️ MCP CoinGecko not available in window object');
            }
        } catch (error) {
            console.warn('⚠️ MCP CoinGecko service initialization failed:', error);
            this.isAvailable = false;
        }
    }


    /**
     * Get trending coins using MCP
     */
    async getTrendingCoins(): Promise<MCPTrendingResult | null> {
        const cacheKey = cacheService.generateCacheKey('mcp_trending');

        // Try cache first
        const cachedData = cacheService.get<MCPTrendingResult>(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            // Check if MCP is available in window
            if (!window.mcpCoingecko?.getTrending) {
                console.warn('🔌 MCP CoinGecko getTrending not available in window');
                return null;
            }

            // Call MCP tool directly
            const result = await window.mcpCoingecko.getTrending();

            if (result) {
                cacheService.set(cacheKey, result, CACHE_TTL.TRENDING);
                console.log('✅ MCP trending coins fetched successfully');
                return result;
            }
        } catch (error) {
            console.error('❌ MCP trending coins error:', error);
        }

        return null;
    }

    /**
     * Get global market data using MCP
     */
    async getGlobalData(): Promise<MCPGlobalData | null> {
        const cacheKey = cacheService.generateCacheKey('mcp_global');

        // Try cache first
        const cachedData = cacheService.get<MCPGlobalData>(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            // Check if MCP is available in window
            if (!window.mcpCoingecko?.getGlobal) {
                console.warn('🔌 MCP CoinGecko getGlobal not available in window');
                return null;
            }

            // Call MCP tool directly
            const result = await window.mcpCoingecko.getGlobal();

            if (result) {
                cacheService.set(cacheKey, result, CACHE_TTL.GLOBAL);
                console.log('✅ MCP global data fetched successfully');
                return result;
            }
        } catch (error) {
            console.error('❌ MCP global data error:', error);
        }

        return null;
    }

    /**
     * Get top gainers and losers using MCP
     */
    async getTopGainersLosers(
        duration = '24h',
        vsCurrency = 'usd',
        topCoins = '1000'
    ): Promise<MCPTopGainersLosers | null> {
        const params = { duration, vs_currency: vsCurrency, top_coins: topCoins };
        const cacheKey = cacheService.generateCacheKey('mcp_gainers_losers', params);

        // Try cache first
        const cachedData = cacheService.get<MCPTopGainersLosers>(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            // Check if MCP is available in window
            if (!window.mcpCoingecko?.getTopGainersLosers) {
                console.warn('🔌 MCP CoinGecko service not available in window');
                return null;
            }

            // Call MCP tool directly
            const result = await window.mcpCoingecko.getTopGainersLosers(params);

            if (result) {
                cacheService.set(cacheKey, result, CACHE_TTL.GAINERS);
                console.log('✅ MCP top gainers/losers fetched successfully');
                return result;
            }
        } catch (error) {
            console.error('❌ MCP top gainers/losers error:', error);
        }

        return null;
    }

    /**
     * Get coins market data using MCP
     */
    async getCoinsMarkets(params: {
        vs_currency?: string;
        ids?: string;
        order?: string;
        per_page?: number;
        page?: number;
        price_change_percentage?: string;
    }): Promise<MCPCoin[] | null> {
        const cacheKey = cacheService.generateCacheKey('mcp_markets', params);

        // Try cache first
        const cachedData = cacheService.get<MCPCoin[]>(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            // Check if MCP is available in window
            if (!window.mcpCoingecko?.getCoinsMarkets) {
                console.warn('🔌 MCP CoinGecko getCoinsMarkets not available in window');
                return null;
            }

            // Call MCP tool directly
            const result = await window.mcpCoingecko.getCoinsMarkets(params);

            if (result) {
                cacheService.set(cacheKey, result, CACHE_TTL.MARKETS);
                console.log('✅ MCP coins markets fetched successfully');
                return result;
            }
        } catch (error) {
            console.error('❌ MCP coins markets error:', error);
        }

        return null;
    }

    /**
     * Get OHLC chart data using MCP
     */
    async getOHLCData(
        coinId: string,
        vsCurrency = 'usd',
        days: number
    ): Promise<any[] | null> {
        const params = { id: coinId, vs_currency: vsCurrency, days };
        const cacheKey = cacheService.generateCacheKey('mcp_ohlc', params);

        // Try cache first
        const cachedData = cacheService.get<any[]>(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            if (!this.isAvailable) {
                console.warn('🔌 MCP CoinGecko service not available');
                return null;
            }

            // Call MCP tool directly
            const result = await window.mcpCoingecko?.getOHLC(params);

            if (result) {
                cacheService.set(cacheKey, result, CACHE_TTL.CHART);
                console.log('✅ MCP OHLC data fetched successfully');
                return result;
            }
        } catch (error) {
            console.error('❌ MCP OHLC data error:', error);
        }

        return null;
    }

    /**
     * Get historical market chart data using MCP
     */
    async getMarketChart(
        coinId: string,
        vsCurrency = 'usd',
        days: number,
        interval?: string
    ): Promise<any | null> {
        const params = { id: coinId, vs_currency: vsCurrency, days, interval };
        const cacheKey = cacheService.generateCacheKey('mcp_chart', params);

        // Try cache first
        const cachedData = cacheService.get<any>(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            if (!this.isAvailable) {
                console.warn('🔌 MCP CoinGecko service not available');
                return null;
            }

            // Call MCP tool directly
            const result = await window.mcpCoingecko?.getMarketChart(params);

            if (result) {
                cacheService.set(cacheKey, result, CACHE_TTL.CHART);
                console.log('✅ MCP market chart fetched successfully');
                return result;
            }
        } catch (error) {
            console.error('❌ MCP market chart error:', error);
        }

        return null;
    }

    /**
     * Check if MCP service is available
     */
    isServiceAvailable(): boolean {
        return this.isAvailable;
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return cacheService.getStats();
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        cacheService.clear();
    }
}

// Create singleton instance
const mcpCoingeckoService = new MCPCoingeckoService();

export default mcpCoingeckoService;

// Type declarations for window object
declare global {
    interface Window {
        mcpCoingecko?: {
            // Core data endpoints
            getTrending: () => Promise<MCPTrendingResult>;
            getGlobal: () => Promise<MCPGlobalData>;
            getTopGainersLosers: (params: {
                duration: string;
                vs_currency: string;
                top_coins: string;
            }) => Promise<MCPTopGainersLosers>;
            getCoinsMarkets: (params: any) => Promise<MCPCoin[]>;
            getOHLC: (params: any) => Promise<any[]>;
            getMarketChart: (params: any) => Promise<any>;

            // Additional methods for compatibility
            getTrendingCoins?: () => Promise<MCPTrendingResult>;
            getCoinsHistory?: (params: any) => Promise<any>;
            getCoinsContract?: (params: any) => Promise<any>;
            getSearch?: (params: any) => Promise<any>;
            getNFTs?: (params: any) => Promise<any>;
            getOnchainNetworks?: () => Promise<any>;
            getOnchainPools?: (params: any) => Promise<any>;
            getOnchainTokens?: (params: any) => Promise<any>;
        };
    }
}