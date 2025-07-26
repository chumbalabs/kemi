import axios, { AxiosError } from 'axios';
import cacheService from './cacheService';

// Basic types for the service responses
export interface Coin {
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

// Type for top gainers/losers response
export interface TopGainerLoser {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number;
  usd: number;
  usd_24h_vol: number;
  usd_1y_change?: number;
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  price_btc: number;
  large?: string;
  thumb?: string;
}

export interface TrendingResult {
  coins: Array<{ item: TrendingCoin }>;
}

export interface GlobalData {
  data: {
    total_market_cap?: { [key: string]: number };
    total_volume?: { [key: string]: number };
    market_cap_percentage?: { [key: string]: number };
    market_cap_change_percentage_24h_usd?: number;
    active_cryptocurrencies?: number;
    markets?: number;
  };
}

export interface ChartDataPoint {
  timestamp: number;
  price: number;
}

export interface HistoricalChartData {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface Category {
  id: string;
  name: string;
  market_cap?: number;
  market_cap_change_24h?: number;
  volume_24h?: number;
  top_3_coins?: string[];
}

export interface CoinMarketParams {
  vs_currency: string;
  ids?: string;
  order?: string;
  per_page?: number;
  page?: number;
  sparkline?: boolean;
  price_change_percentage?: string;
}

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  TRENDING: 5 * 60 * 1000,      // 5 minutes - trending changes frequently
  MARKETS: 2 * 60 * 1000,       // 2 minutes - price data changes quickly
  GLOBAL: 5 * 60 * 1000,        // 5 minutes - global data is more stable
  GAINERS: 2 * 60 * 1000,       // 2 minutes - gainers data changes frequently
  CHART: 1 * 60 * 1000,         // 1 minute - chart data changes frequently
} as const;

// Rate limiting configuration
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  requestQueue: number[];
  isRateLimited: boolean;
  rateLimitResetTime: number;
}

const rateLimitConfig: RateLimitConfig = {
  maxRequestsPerMinute: 25, // Conservative limit (CoinGecko free tier allows ~30/min)
  requestQueue: [],
  isRateLimited: false,
  rateLimitResetTime: 0,
};

// Rate limiting function
const checkRateLimit = (): boolean => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Clean old requests from queue
  rateLimitConfig.requestQueue = rateLimitConfig.requestQueue.filter(time => time > oneMinuteAgo);
  
  // Check if we're currently rate limited
  if (rateLimitConfig.isRateLimited && now < rateLimitConfig.rateLimitResetTime) {
    return false;
  }
  
  // Check if we can make a request
  if (rateLimitConfig.requestQueue.length >= rateLimitConfig.maxRequestsPerMinute) {
    return false;
  }
  
  // Add current request to queue
  rateLimitConfig.requestQueue.push(now);
  return true;
};

// Handle rate limit response
const handleRateLimit = (error: AxiosError): void => {
  if (error.response?.status === 429) {
    rateLimitConfig.isRateLimited = true;
    // Reset rate limit after 1 minute
    rateLimitConfig.rateLimitResetTime = Date.now() + 60000;
    console.warn('🚨 Rate limited by CoinGecko API. Waiting 60 seconds before next request.');
  }
};

// Sleep function for delays
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced request function with rate limiting and retry logic
const makeRateLimitedRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T | null> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check rate limit before making request
    if (!checkRateLimit()) {
      console.warn(`⏱️ Rate limit reached. Waiting before retry... (attempt ${attempt + 1})`);
      await sleep(baseDelay * Math.pow(2, attempt)); // Exponential backoff
      continue;
    }

    try {
      return await requestFn();
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Handle rate limiting
      if (axiosError.response?.status === 429) {
        handleRateLimit(axiosError);
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`🔄 Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1})`);
          await sleep(delay);
          continue;
        }
      }
      
      // Handle CORS and network errors
      if (axiosError.code === 'ERR_NETWORK' || axiosError.message.includes('CORS')) {
        console.warn('🌐 Network/CORS error detected. Using cached or mock data.');
        return null;
      }
      
      // For other errors, log and continue
      console.error(`❌ API request failed (attempt ${attempt + 1}):`, axiosError.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
  
  return null;
};

// Create an axios instance for CoinGecko API
const coingeckoApi = axios.create({
  baseURL: import.meta.env.DEV 
    ? '/api/coingecko' // Use proxy in development
    : 'https://api.coingecko.com/api/v3', // Direct API in production
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set the API key
export const setApiKey = (apiKey: string | undefined) => {
  if (apiKey && apiKey.trim() !== '') {
    coingeckoApi.defaults.headers.common['x-cg-demo-api-key'] = apiKey;
  }
};

// Function to get trending coins with MCP integration
export const getTrendingCoins = async (): Promise<TrendingResult> => {
  const cacheKey = cacheService.generateCacheKey('trending');
  
  // Try to get from cache first
  const cachedData = cacheService.get<TrendingResult>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    // Use MCP for more reliable data fetching
    const result = await window.mcpCoingecko?.getTrending?.() || 
      await makeRateLimitedRequest(async () => {
        const response = await coingeckoApi.get('/search/trending');
        return response.data;
      });

    if (result) {
      // Cache the response
      cacheService.set(cacheKey, result, CACHE_TTL.TRENDING);
      return result;
    }
  } catch (error) {
    console.warn('📊 MCP trending coins failed, falling back to REST API');
    
    const result = await makeRateLimitedRequest(async () => {
      const response = await coingeckoApi.get('/search/trending');
      return response.data;
    });

    if (result) {
      cacheService.set(cacheKey, result, CACHE_TTL.TRENDING);
      return result;
    }
  }

  // Return empty fallback if API fails
  console.warn('📊 All trending coins APIs failed, returning empty data');
  return { coins: [] };
};

// Function to get top gainers and losers with rate limiting
export const getTopGainersLosers = async (
  vsCurrency = 'usd',
  duration = '24h',
  topCoins = '1000'
): Promise<Coin[]> => {
  const params = { vs_currency: vsCurrency, duration, top_coins: topCoins };
  const cacheKey = cacheService.generateCacheKey('top_gainers', params);
  
  // Try to get from cache first
  const cachedData = cacheService.get<Coin[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const result = await makeRateLimitedRequest(async () => {
    const response = await coingeckoApi.get('/coins/markets', {
      params: {
        vs_currency: vsCurrency,
        order: 'price_change_percentage_24h_desc',
        per_page: 30,
        page: 1,
        price_change_percentage: '24h',
        sparkline: false,
      },
    });
    
    // Filter and sort gainers
    return response.data
      .filter((coin: Coin) => 
        coin.price_change_percentage_24h !== null && 
        coin.price_change_percentage_24h !== undefined &&
        coin.price_change_percentage_24h > 0 &&
        coin.total_volume && coin.total_volume > 50000
      )
      .sort((a: Coin, b: Coin) => 
        (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
      );
  });

  if (result) {
    // Cache the response
    cacheService.set(cacheKey, result, CACHE_TTL.GAINERS);
    return result;
  }

  // Return empty fallback if API fails
  console.warn('📈 Top gainers API failed, returning empty data');
  return [];
};

// Function to get coins market data with rate limiting and caching
export const getCoinsMarkets = async (params: CoinMarketParams): Promise<Coin[]> => {
  const cacheKey = cacheService.generateCacheKey('markets', params);
  
  // Try to get from cache first
  const cachedData = cacheService.get<Coin[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const result = await makeRateLimitedRequest(async () => {
    const response = await coingeckoApi.get('/coins/markets', { params });
    return response.data;
  });

  if (result) {
    // Cache the response
    cacheService.set(cacheKey, result, CACHE_TTL.MARKETS);
    return result;
  }

  // Return empty fallback if API fails
  console.warn('💰 Coins market data API failed, returning empty data');
  return [];
};

// Function to get global market data with rate limiting and caching
export const getGlobal = async (): Promise<GlobalData> => {
  const cacheKey = cacheService.generateCacheKey('global');
  
  // Try to get from cache first
  const cachedData = cacheService.get<GlobalData>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const result = await makeRateLimitedRequest(async () => {
    const response = await coingeckoApi.get('/global');
    return response.data;
  });

  if (result) {
    // Cache the response
    cacheService.set(cacheKey, result, CACHE_TTL.GLOBAL);
    return result;
  }

  // Return fallback data if API fails
  console.warn('🌍 Global market data API failed, returning fallback data');
  return { 
    data: {
      total_market_cap: { usd: 0 },
      total_volume: { usd: 0 },
      market_cap_percentage: { btc: 0, eth: 0 },
      market_cap_change_percentage_24h_usd: 0,
      active_cryptocurrencies: 0,
      markets: 0
    } 
  };
};

// Original getCoinMarkets function for backward compatibility with caching
export const getCoinMarkets = async (
  vsCurrency = 'usd',
  page = 1,
  perPage = 50,
  ids?: string
): Promise<Coin[]> => {
  const params = { vs_currency: vsCurrency, page, per_page: perPage, ids };
  const cacheKey = cacheService.generateCacheKey('coin_markets', params);
  
  // Try to get from cache first
  const cachedData = cacheService.get<Coin[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await coingeckoApi.get('/coins/markets', {
      params: {
        vs_currency: vsCurrency,
        page,
        per_page: perPage,
        ids,
      },
    });
    const data = response.data;
    
    // Cache the response
    cacheService.set(cacheKey, data, CACHE_TTL.MARKETS);
    
    return data;
  } catch (error) {
    console.error('Error fetching coins market data:', error);
    return [];
  }
};

// Function to get global market data (legacy version) with caching
export const getGlobalData = async (): Promise<any> => {
  const cacheKey = cacheService.generateCacheKey('global_legacy');
  
  // Try to get from cache first
  const cachedData = cacheService.get<any>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await coingeckoApi.get('/global');
    const data = response.data;
    
    // Cache the response
    cacheService.set(cacheKey, data, CACHE_TTL.GLOBAL);
    
    return data;
  } catch (error) {
    console.error('Error fetching global market data:', error);
    return {};
  }
};

// Function to get historical chart data with rate limiting and caching
export const getHistoricalChartData = async (
  coinId: string,
  vsCurrency = 'usd',
  days: number,
  interval = 'daily'
): Promise<ChartDataPoint[]> => {
  const params = { coin_id: coinId, vs_currency: vsCurrency, days, interval };
  const cacheKey = cacheService.generateCacheKey('chart_data', params);
  
  // Try to get from cache first
  const cachedData = cacheService.get<ChartDataPoint[]>(cacheKey);
  if (cachedData) { 
    console.log(`📊 Cache hit for ${coinId} ${days}d chart data`);
    return cachedData; 
  }

  // Determine endpoint based on time period
  let endpoint: string;
  if (days === 1) {
    endpoint = `/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=1`;
    console.log(`📈 Fetching 24h data for ${coinId}`);
  } else if (days <= 30) {
    endpoint = `/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=daily`;
    console.log(`📈 Fetching ${days}d data for ${coinId}`);
  } else {
    endpoint = `/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}`;
    console.log(`📈 Fetching ${days}d data for ${coinId}`);
  }

  const result = await makeRateLimitedRequest(async () => {
    const response = await coingeckoApi.get(endpoint);
    console.log(`✅ API Response for ${days}d:`, response.status, response.data ? 'Data received' : 'No data');
    return response.data;
  });

  if (result) {
    const data: HistoricalChartData = result;
    
    if (!data.prices || !Array.isArray(data.prices)) {
      console.error(`❌ Invalid data structure for ${days}d:`, data);
      return getMockChartData(days);
    }
    
    // Convert to our format with proper typing
    const chartData: ChartDataPoint[] = data.prices.map((pricePoint: [number, number]) => ({
      timestamp: pricePoint[0],
      price: pricePoint[1]
    }));
    
    console.log(`✨ Processed ${chartData.length} data points for ${days}d chart`);
    
    // Cache for shorter periods for recent data, longer for historical data
    const cacheTTL = days <= 7 ? CACHE_TTL.CHART : 60 * 60 * 1000; // 1 hour for historical
    cacheService.set(cacheKey, chartData, cacheTTL);
    
    return chartData;
  }

  // Return mock data if API fails
  console.warn(`⚠️ Chart data API failed for ${coinId} ${days}d, using mock data`);
  return getMockChartData(days);
};

// Helper function to generate mock chart data
const getMockChartData = (days: number): ChartDataPoint[] => {
  const now = Date.now();
  const points = Math.min(days * 24, 100); // Max 100 points
  const interval = (days * 24 * 60 * 60 * 1000) / points;
  
  return Array.from({ length: points }, (_, i) => ({
    timestamp: now - (points - i) * interval,
    price: 50000 + Math.random() * 10000 * Math.sin(i / 10) // Mock price pattern
  }));
};

// Export cache service for manual cache management
export { cacheService };

const coingeckoService = {
  setApiKey,
  getTrendingCoins,
  getTopGainersLosers,
  getCoinMarkets,
  getCoinsMarkets,
  getGlobalData,
  getGlobal,
  getHistoricalChartData,
  // Cache management functions
  clearCache: () => cacheService.clear(),
  getCacheStats: () => cacheService.getStats(),
};

export default coingeckoService; 