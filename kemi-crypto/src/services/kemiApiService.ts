/**
 * Service for interacting with the Kemi Crypto API backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface TechnicalIndicators {
  sma_20: number;
  sma_50: number;
  ema_12: number;
  ema_26: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  bollinger_bands: {
    upper: number;
    middle: number;
    lower: number;
  };
  support_resistance: {
    support: number;
    resistance: number;
  };
  volume_sma: number;
  volatility: number;
}

export interface TechnicalSignals {
  trend: string;
  strength: string;
  recommendation: string;
  confidence: number;
  key_levels: {
    support: number;
    resistance: number;
    sma_20: number;
    sma_50: number;
  };
  signals: string[];
}

export interface TechnicalAnalysis {
  indicators: TechnicalIndicators;
  trend_analysis: {
    trend: string;
    strength: string;
    confidence: number;
    price_change: number;
  };
  signals: TechnicalSignals;
  summary: {
    current_price: number;
    price_change_24h: number;
    data_points: number;
    analysis_quality: string;
  };
}

export interface AIAnalysis {
  analysis: string;
  provider: string;
  timestamp: string;
  coin_id: string;
  coin_name: string;
  technical_summary: any;
  recommendation: string;
  confidence: number;
}

export interface CoinInfo {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_cap_rank: number;
  categories: string[];
}

export interface MarketData {
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_24h: number;
  price_change_7d: number;
  price_change_30d: number;
  circulating_supply: number;
  total_supply: number;
  ath: number;
  atl: number;
}

export interface CoinAnalysisResponse {
  coin_id: string;
  cached: boolean;
  cache_age?: number;
  coin_info: CoinInfo;
  market_data: MarketData;
  technical_analysis: TechnicalAnalysis;
  ai_analysis: AIAnalysis;
  ohlc_data: number[][];
  data_quality: {
    ohlc_data_points: number;
    analysis_reliability: string;
    last_updated: string;
  };
}

class KemiApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Get comprehensive coin analysis including technical indicators and AI insights
   */
  async getCoinAnalysis(coinId: string, forceRefresh = false): Promise<CoinAnalysisResponse> {
    const url = new URL(`${this.baseUrl}/api/coins/${coinId}/analysis`);
    if (forceRefresh) {
      url.searchParams.set('force_refresh', 'true');
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch coin analysis: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get only technical analysis for a coin
   */
  async getTechnicalAnalysis(coinId: string, days = 30): Promise<any> {
    const url = new URL(`${this.baseUrl}/api/coins/${coinId}/technical`);
    url.searchParams.set('days', days.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch technical analysis: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get OHLC data for a coin
   */
  async getOHLCData(coinId: string, days = 30, interval = 'daily'): Promise<any> {
    const url = new URL(`${this.baseUrl}/api/coins/${coinId}/ohlc`);
    url.searchParams.set('days', days.toString());
    url.searchParams.set('interval', interval);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch OHLC data: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get API health status
   */
  async getHealthStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch health status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get top gainers and losers
   */
  async getTopGainersLosers(
    vs_currency = 'usd',
    duration = '24h',
    top_coins = '1000'
  ): Promise<{
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
  }> {
    const url = new URL(`${this.baseUrl}/api/top-gainers-losers`);
    url.searchParams.set('vs_currency', vs_currency);
    url.searchParams.set('duration', duration);
    url.searchParams.set('top_coins', top_coins);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch top gainers/losers: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get trending coins
   */
  async getTrendingCoins(): Promise<{
    coins: Array<{
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
  }> {
    const response = await fetch(`${this.baseUrl}/api/trending`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch trending coins: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get global market data
   */
  async getGlobalMarketData(): Promise<{
    total_market_cap_usd: number;
    total_volume_usd: number;
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
    markets: number;
  }> {
    const response = await fetch(`${this.baseUrl}/api/global`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch global market data: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get market summary (combines multiple endpoints)
   */
  async getMarketSummary(): Promise<{
    global_data: {
      total_market_cap_usd: number;
      total_volume_usd: number;
      market_cap_change_percentage_24h_usd: number;
      active_cryptocurrencies: number;
      markets: number;
    };
    trending_coins: Array<{
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
  }> {
    const response = await fetch(`${this.baseUrl}/api/market-summary`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market summary: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Clear analysis cache
   */
  async clearCache(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/cache/clear`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear cache: ${response.statusText}`);
    }

    return response.json();
  }
}

export default new KemiApiService();