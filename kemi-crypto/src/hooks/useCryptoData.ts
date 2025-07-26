import { useState, useEffect } from 'react';
import coingeckoService from '../services/coingeckoService';
import mcpCoingeckoService from '../services/mcpCoingeckoService';
import type { Coin, TrendingResult } from '../services/coingeckoService';
import openaiService from '../services/openaiService';

interface CryptoData {
  trendingCoins: TrendingResult['coins'];
  topCoins: Coin[];
  topGainers: Coin[];
  globalMarketData: {
    totalMarketCap: number;
    marketCapChange24h: number;
    totalVolume: number;
  };
  aiAnalysis: string;
  isLoadingTrending: boolean;
  isLoadingCoins: boolean;
  isLoadingGainers: boolean;
  isLoadingMarketData: boolean;
  isLoadingAnalysis: boolean;
  error: string | null;
  // New options for expanding data
  coinsPerPage: number;
  totalPages: number;
  currentPage: number;
  setCoinsPerPage: (perPage: number) => void;
  setCurrentPage: (page: number) => void;
}

interface UseCryptoDataProps {
  apiKey?: string;
  openAiApiKey?: string;
  openAiBaseUrl?: string;
  initialCoinsPerPage?: number;
}

export function useCryptoData({ 
  apiKey,
  openAiApiKey,
  openAiBaseUrl,
  initialCoinsPerPage = 100
}: UseCryptoDataProps = {}): CryptoData {
  const [trendingCoins, setTrendingCoins] = useState<TrendingResult['coins']>([]);
  const [topCoins, setTopCoins] = useState<Coin[]>([]);
  const [topGainers, setTopGainers] = useState<Coin[]>([]);
  const [globalMarketData, setGlobalMarketData] = useState({
    totalMarketCap: 0,
    marketCapChange24h: 0,
    totalVolume: 0
  });
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(false);
  const [isLoadingCoins, setIsLoadingCoins] = useState<boolean>(false);
  const [isLoadingGainers, setIsLoadingGainers] = useState<boolean>(false);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState<boolean>(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [coinsPerPage, setCoinsPerPage] = useState<number>(initialCoinsPerPage);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Function to fetch trending coins
  const fetchTrendingCoins = async () => {
    try {
      setIsLoadingTrending(true);
      setError(null);
      const data = await coingeckoService.getTrendingCoins();
      setTrendingCoins(data.coins);
    } catch (err) {
      setError('Failed to fetch trending coins');
      console.error('Error fetching trending coins:', err);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  // Function to fetch top gainers using MCP service for real-time data
  const fetchTopGainers = async () => {
    try {
      setIsLoadingGainers(true);
      setError(null);
      
      // Try MCP service first for real-time data
      const mcpData = await mcpCoingeckoService.getTopGainersLosers('24h', 'usd', '1000');
      
      if (mcpData?.top_gainers) {
        // Filter out stablecoins and low-change coins
        const stablecoinSymbols = ['USDT', 'USDC', 'BUSD', 'DAI', 'FRAX', 'TUSD', 'USDP', 'USDE', 'FDUSD'];
        const stablecoinNames = ['Tether', 'USD Coin', 'Binance USD', 'Dai', 'Frax', 'TrueUSD', 'Pax Dollar', 'Ethena USDe', 'First Digital USD'];
        
        const filteredGainers = mcpData.top_gainers
          .filter(coin => {
            // Filter out stablecoins by symbol
            if (stablecoinSymbols.includes(coin.symbol.toUpperCase())) {
              return false;
            }
            
            // Filter out stablecoins by name
            if (stablecoinNames.some(name => coin.name.toLowerCase().includes(name.toLowerCase()))) {
              return false;
            }
            
            // Filter out coins with very low change (likely stablecoins or errors)
            if (coin.usd_24h_change < 5) { // Only show coins with >5% gain
              return false;
            }
            
            // Filter out coins with suspicious price patterns
            if (coin.usd === 1.0 || (coin.usd > 0.999 && coin.usd < 1.001)) {
              return false;
            }
            
            return true;
          })
          .map(coin => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: coin.image,
            current_price: coin.usd,
            market_cap_rank: coin.market_cap_rank,
            price_change_percentage_24h: coin.usd_24h_change,
            total_volume: coin.usd_24h_vol
          } as Coin));
        
        setTopGainers(filteredGainers);
        console.log('🚀 MCP Top Gainers loaded:', filteredGainers.slice(0, 3).map(c => `${c.name}: +${c.price_change_percentage_24h?.toFixed(2)}%`));
      } else {
        // Fallback to regular API
        console.warn('📊 MCP top gainers failed, falling back to REST API');
        const data = await coingeckoService.getTopGainersLosers('usd', '24h', '1000');
        setTopGainers(data);
      }
      
    } catch (err) {
      setError('Failed to fetch top gainers');
      console.error('Error fetching top gainers:', err);
      
      // Final fallback to regular API
      try {
        const data = await coingeckoService.getTopGainersLosers('usd', '24h', '1000');
        setTopGainers(data);
      } catch (fallbackErr) {
        console.error('Fallback API also failed:', fallbackErr);
      }
    } finally {
      setIsLoadingGainers(false);
    }
  };

  // Function to fetch top coins by market cap
  const fetchTopCoins = async () => {
    try {
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
      
      // Calculate total pages (assuming max 10,000 coins)
      setTotalPages(Math.ceil(10000 / coinsPerPage));
      
    } catch (err) {
      setError('Failed to fetch top coins');
      console.error('Error fetching top coins:', err);
    } finally {
      setIsLoadingCoins(false);
    }
  };

  // Function to fetch global market data
  const fetchGlobalMarketData = async () => {
    try {
      setIsLoadingMarketData(true);
      setError(null);
      const data = await coingeckoService.getGlobal();
      
      if (data && data.data) {
        setGlobalMarketData({
          totalMarketCap: data.data.total_market_cap?.usd || 0,
          marketCapChange24h: data.data.market_cap_change_percentage_24h_usd || 0,
          totalVolume: data.data.total_volume?.usd || 0
        });
      }
    } catch (err) {
      setError('Failed to fetch global market data');
      console.error('Error fetching global market data:', err);
    } finally {
      setIsLoadingMarketData(false);
    }
  };

  // Function to generate AI analysis
  const generateAiAnalysis = async () => {
    if (!openAiApiKey || openAiApiKey.trim() === '') {
      setAiAnalysis('');
      return;
    }

    try {
      setIsLoadingAnalysis(true);
      setError(null);

      // Configure OpenAI with the provided API key and base URL
      openaiService.configureOpenAI(openAiApiKey, openAiBaseUrl);

      // Get top 5 coins and their data for the AI analysis
      const top5Coins = topCoins.slice(0, 5).map(coin => ({
        name: coin.name,
        price: coin.current_price,
        price_change_24h: coin.price_change_percentage_24h,
        market_cap: coin.market_cap
      }));

      const prompt = `
        As a cryptocurrency market analyst, provide a brief market summary based on this data:
        
        Top 5 cryptocurrencies by market cap:
        ${top5Coins.map(coin => 
          `${coin.name}: $${coin.price} (${coin.price_change_24h?.toFixed(2)}% in 24h)`
        ).join('\n')}
        
        Global market cap: $${(globalMarketData.totalMarketCap / 1e12).toFixed(2)}T (${globalMarketData.marketCapChange24h.toFixed(2)}% in 24h)
        24h trading volume: $${(globalMarketData.totalVolume / 1e9).toFixed(2)}B
        
        Provide a concise 2-3 sentence analysis of the current market conditions.
      `;

      const analysis = await openaiService.generateAnalysis(prompt);
      setAiAnalysis(analysis);
    } catch (err) {
      setError('Failed to generate AI analysis');
      console.error('Error generating AI analysis:', err);
      setAiAnalysis('AI analysis unavailable. Please check your API key and try again.');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Initialize API keys and fetch data when component mounts or when API keys change
  useEffect(() => {
    if (apiKey) {
      coingeckoService.setApiKey(apiKey);
    }
    
    fetchTrendingCoins();
    fetchTopGainers(); // Fetch top gainers separately
    fetchGlobalMarketData();
  }, [apiKey]);

  // Fetch top coins when pagination settings change
  useEffect(() => {
    fetchTopCoins();
  }, [coinsPerPage, currentPage]);

  // Generate AI analysis when top coins or market data changes
  useEffect(() => {
    if (topCoins.length > 0 && globalMarketData.totalMarketCap > 0 && openAiApiKey) {
      generateAiAnalysis();
    }
  }, [topCoins, globalMarketData, openAiApiKey]);

  return {
    trendingCoins,
    topCoins,
    topGainers,
    globalMarketData,
    aiAnalysis,
    isLoadingTrending,
    isLoadingCoins,
    isLoadingGainers,
    isLoadingMarketData,
    isLoadingAnalysis,
    error,
    coinsPerPage,
    totalPages,
    currentPage,
    setCoinsPerPage,
    setCurrentPage
  };
} 