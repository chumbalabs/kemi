import { useState, useEffect } from 'react';
import kemiApiService from '../services/kemiApiService';
import coingeckoService from '../services/coingeckoService';
import type { Coin } from '../services/coingeckoService';

// Cache configuration
const CACHE_KEYS = {
    TRENDING_COINS: 'kemi_trending_coins',
    TOP_GAINERS: 'kemi_top_gainers',
    GLOBAL_MARKET_DATA: 'kemi_global_market_data',
    TOP_COINS: 'kemi_top_coins',
} as const;

const CACHE_DURATION = {
    TRENDING_COINS: 15 * 60 * 1000, // 15 minutes
    TOP_GAINERS: 10 * 60 * 1000,   // 10 minutes
    GLOBAL_MARKET_DATA: 15 * 60 * 1000, // 15 minutes
    TOP_COINS: 5 * 60 * 1000,      // 5 minutes
} as const;

// In-memory cache for even faster access
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache utilities
const cacheUtils = {
    set: (key: string, data: any, ttl: number) => {
        const cacheEntry = {
            data,
            timestamp: Date.now(),
            ttl
        };

        // Store in memory cache
        memoryCache.set(key, cacheEntry);

        // Store in localStorage
        try {
            localStorage.setItem(key, JSON.stringify(cacheEntry));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    },

    get: (key: string) => {
        // Try memory cache first (fastest)
        let cacheEntry = memoryCache.get(key);

        // If not in memory, try localStorage
        if (!cacheEntry) {
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    cacheEntry = JSON.parse(stored);
                    // Restore to memory cache
                    if (cacheEntry) {
                        memoryCache.set(key, cacheEntry);
                    }
                }
            } catch (error) {
                console.warn('Failed to read from localStorage:', error);
                return null;
            }
        }

        if (!cacheEntry) return null;

        // Check if cache is still valid
        const isValid = (Date.now() - cacheEntry.timestamp) < cacheEntry.ttl;

        if (isValid) {
            return cacheEntry.data;
        } else {
            // Clean up expired cache
            cacheUtils.remove(key);
            return null;
        }
    },

    remove: (key: string) => {
        memoryCache.delete(key);
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
        }
    },

    clear: () => {
        memoryCache.clear();
        try {
            Object.values(CACHE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    },

    getStats: () => {
        const stats = {
            memoryCache: memoryCache.size,
            localStorage: 0,
            cacheHits: 0,
            totalSize: 0
        };

        try {
            Object.values(CACHE_KEYS).forEach(key => {
                const item = localStorage.getItem(key);
                if (item) {
                    stats.localStorage++;
                    stats.totalSize += item.length;
                }
            });
        } catch (error) {
            console.warn('Failed to get cache stats:', error);
        }

        return stats;
    }
};

interface KemiData {
    trendingCoins: Array<{
        item: {
            id: string;
            name: string;
            symbol: string;
            market_cap_rank: number;
            price_btc: number;
            thumb?: string;
            large?: string;
        };
    }>;
    topCoins: Coin[];
    topGainers: Array<{
        id: string;
        symbol: string;
        name: string;
        image: string;
        market_cap_rank: number;
        usd: number;
        usd_24h_vol: number;
        usd_24h_change: number;
    }>;
    globalMarketData: {
        totalMarketCap: number;
        marketCapChange24h: number;
        totalVolume: number;
        activeCryptocurrencies: number;
        markets: number;
    };
    isLoadingTrending: boolean;
    isLoadingCoins: boolean;
    isLoadingGainers: boolean;
    isLoadingMarketData: boolean;
    error: string | null;
    // Pagination for coins table
    coinsPerPage: number;
    totalPages: number;
    currentPage: number;
    setCoinsPerPage: (perPage: number) => void;
    setCurrentPage: (page: number) => void;
    // Refresh functions
    refreshData: () => void;
    clearCache: () => void;
    getCacheStats: () => any;
}

interface UseKemiDataProps {
    apiKey?: string;
    initialCoinsPerPage?: number;
}

export function useKemiData({
    apiKey,
    initialCoinsPerPage = 100
}: UseKemiDataProps = {}): KemiData {
    const [trendingCoins, setTrendingCoins] = useState<KemiData['trendingCoins']>([]);
    const [topCoins, setTopCoins] = useState<Coin[]>([]);
    const [topGainers, setTopGainers] = useState<KemiData['topGainers']>([]);
    const [globalMarketData, setGlobalMarketData] = useState<KemiData['globalMarketData']>({
        totalMarketCap: 0,
        marketCapChange24h: 0,
        totalVolume: 0,
        activeCryptocurrencies: 0,
        markets: 0
    });

    const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(false);
    const [isLoadingCoins, setIsLoadingCoins] = useState<boolean>(false);
    const [isLoadingGainers, setIsLoadingGainers] = useState<boolean>(false);
    const [isLoadingMarketData, setIsLoadingMarketData] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [coinsPerPage, setCoinsPerPage] = useState<number>(initialCoinsPerPage);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);

    // Function to load cached data immediately
    const loadCachedData = () => {
        console.log('⚡ Loading cached data for instant display...');

        // Load trending coins from cache
        const cachedTrending = cacheUtils.get(CACHE_KEYS.TRENDING_COINS);
        if (cachedTrending) {
            setTrendingCoins(cachedTrending);
            console.log('� FTrending coins loaded from cache:', cachedTrending.length);
        }

        // Load top gainers from cache
        const cachedGainers = cacheUtils.get(CACHE_KEYS.TOP_GAINERS);
        if (cachedGainers) {
            setTopGainers(cachedGainers);
            console.log('💾 Top gainers loaded from cache:', cachedGainers.length);
        }

        // Load global market data from cache
        const cachedGlobal = cacheUtils.get(CACHE_KEYS.GLOBAL_MARKET_DATA);
        if (cachedGlobal) {
            setGlobalMarketData(cachedGlobal);
            console.log('💾 Global market data loaded from cache');
        }

        // Load top coins from cache
        const cachedCoins = cacheUtils.get(CACHE_KEYS.TOP_COINS);
        if (cachedCoins && cachedCoins.page === currentPage && cachedCoins.perPage === coinsPerPage) {
            setTopCoins(cachedCoins.data);
            console.log('💾 Top coins loaded from cache:', cachedCoins.data.length);
        }
    };

    // Function to fetch market summary (combines trending, gainers, and global data)
    const fetchMarketSummary = async (useCache = true) => {
        try {
            // Load cached data first for instant display
            if (useCache) {
                loadCachedData();
            }

            setIsLoadingTrending(true);
            setIsLoadingGainers(true);
            setIsLoadingMarketData(true);
            setError(null);

            console.log('🔄 Fetching fresh market summary from Kemi API...');
            const data = await kemiApiService.getMarketSummary();

            // Set trending coins and cache them
            if (data.trending_coins) {
                setTrendingCoins(data.trending_coins);
                cacheUtils.set(CACHE_KEYS.TRENDING_COINS, data.trending_coins, CACHE_DURATION.TRENDING_COINS);
                console.log('📈 Trending coins loaded and cached:', data.trending_coins.length);
            }

            // Set top gainers and cache them
            if (data.top_gainers) {
                setTopGainers(data.top_gainers);
                cacheUtils.set(CACHE_KEYS.TOP_GAINERS, data.top_gainers, CACHE_DURATION.TOP_GAINERS);
                console.log('🚀 Top gainers loaded and cached:', data.top_gainers.length);
            }

            // Set global market data and cache it
            if (data.global_data) {
                const globalData = {
                    totalMarketCap: data.global_data.total_market_cap_usd || 0,
                    marketCapChange24h: data.global_data.market_cap_change_percentage_24h_usd || 0,
                    totalVolume: data.global_data.total_volume_usd || 0,
                    activeCryptocurrencies: data.global_data.active_cryptocurrencies || 0,
                    markets: data.global_data.markets || 0
                };
                setGlobalMarketData(globalData);
                cacheUtils.set(CACHE_KEYS.GLOBAL_MARKET_DATA, globalData, CACHE_DURATION.GLOBAL_MARKET_DATA);
                console.log('🌍 Global market data loaded and cached');
            }

        } catch (err) {
            console.error('❌ Error fetching market summary:', err);
            setError('Failed to fetch market data');

            // Fallback to individual API calls if market summary fails
            await fetchDataIndividually();
        } finally {
            setIsLoadingTrending(false);
            setIsLoadingGainers(false);
            setIsLoadingMarketData(false);
        }
    };

    // Fallback function to fetch data individually
    const fetchDataIndividually = async () => {
        console.log('🔄 Falling back to individual API calls...');

        // Fetch trending coins
        try {
            const trendingData = await kemiApiService.getTrendingCoins();
            if (trendingData.coins) {
                setTrendingCoins(trendingData.coins);
                cacheUtils.set(CACHE_KEYS.TRENDING_COINS, trendingData.coins, CACHE_DURATION.TRENDING_COINS);
            }
        } catch (err) {
            console.error('❌ Error fetching trending coins:', err);
        }

        // Fetch top gainers
        try {
            const gainersData = await kemiApiService.getTopGainersLosers();
            if (gainersData.top_gainers) {
                setTopGainers(gainersData.top_gainers);
                cacheUtils.set(CACHE_KEYS.TOP_GAINERS, gainersData.top_gainers, CACHE_DURATION.TOP_GAINERS);
            }
        } catch (err) {
            console.error('❌ Error fetching top gainers:', err);
        }

        // Fetch global market data
        try {
            const globalData = await kemiApiService.getGlobalMarketData();
            const formattedGlobalData = {
                totalMarketCap: globalData.total_market_cap_usd || 0,
                marketCapChange24h: globalData.market_cap_change_percentage_24h_usd || 0,
                totalVolume: globalData.total_volume_usd || 0,
                activeCryptocurrencies: globalData.active_cryptocurrencies || 0,
                markets: globalData.markets || 0
            };
            setGlobalMarketData(formattedGlobalData);
            cacheUtils.set(CACHE_KEYS.GLOBAL_MARKET_DATA, formattedGlobalData, CACHE_DURATION.GLOBAL_MARKET_DATA);
        } catch (err) {
            console.error('❌ Error fetching global market data:', err);
        }
    };

    // Function to fetch top coins by market cap (still using CoinGecko directly for the table)
    const fetchTopCoins = async (useCache = true) => {
        try {
            // Check cache first
            if (useCache) {
                const cachedCoins = cacheUtils.get(CACHE_KEYS.TOP_COINS);
                if (cachedCoins && cachedCoins.page === currentPage && cachedCoins.perPage === coinsPerPage) {
                    setTopCoins(cachedCoins.data);
                    console.log('💾 Top coins loaded from cache:', cachedCoins.data.length);
                    // Still fetch fresh data in background but don't show loading
                    fetchTopCoins(false);
                    return;
                }
            }

            setIsLoadingCoins(true);
            setError(null);

            // Get coins with market data, including price changes for different time periods
            const data = await coingeckoService.getCoinsMarkets({
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: coinsPerPage,
                page: currentPage,
                price_change_percentage: '1h,24h,7d'
            });

            setTopCoins(data);

            // Cache the data with pagination info
            cacheUtils.set(CACHE_KEYS.TOP_COINS, {
                data,
                page: currentPage,
                perPage: coinsPerPage,
                timestamp: Date.now()
            }, CACHE_DURATION.TOP_COINS);

            // Calculate total pages (assuming max 10,000 coins)
            setTotalPages(Math.ceil(10000 / coinsPerPage));

            console.log('💰 Top coins loaded and cached:', data.length);

        } catch (err) {
            setError('Failed to fetch top coins');
            console.error('❌ Error fetching top coins:', err);
        } finally {
            setIsLoadingCoins(false);
        }
    };

    // Refresh all data (force fresh fetch)
    const refreshData = () => {
        console.log('🔄 Force refreshing all data...');
        fetchMarketSummary(false); // Don't use cache
        fetchTopCoins(false); // Don't use cache
    };

    // Clear all cached data
    const clearCache = () => {
        console.log('🗑️ Clearing all cached data...');
        cacheUtils.clear();
    };

    // Get cache statistics
    const getCacheStats = () => {
        return cacheUtils.getStats();
    };

    // Initialize API keys and fetch data when component mounts
    useEffect(() => {
        if (apiKey) {
            coingeckoService.setApiKey(apiKey);
        }

        // Load cached data immediately, then fetch fresh data
        fetchMarketSummary(true);
    }, [apiKey]);

    // Fetch top coins when pagination settings change
    useEffect(() => {
        fetchTopCoins(true);
    }, [coinsPerPage, currentPage]);

    return {
        trendingCoins,
        topCoins,
        topGainers,
        globalMarketData,
        isLoadingTrending,
        isLoadingCoins,
        isLoadingGainers,
        isLoadingMarketData,
        error,
        coinsPerPage,
        totalPages,
        currentPage,
        setCoinsPerPage,
        setCurrentPage,
        refreshData,
        clearCache,
        getCacheStats
    };
}