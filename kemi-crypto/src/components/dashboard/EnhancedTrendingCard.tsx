import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface TrendingCoin {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  small: string;
  large: string;
  slug: string;
  price_btc: number;
  score: number;
  data: {
    price: number;
    price_btc: string;
    price_change_percentage_24h: any;
    market_cap: string;
    market_cap_btc: string;
    total_volume: string;
    total_volume_btc: string;
    sparkline: string;
    content: any;
  };
}

interface EnhancedTrendingCardProps {
  isLoading?: boolean;
}

const EnhancedTrendingCard: FC<EnhancedTrendingCardProps> = ({ isLoading = false }) => {
  const navigate = useNavigate();
  const [trendingCoins, setTrendingCoins] = useState<TrendingCoin[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const fetchTrendingCoins = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      // Use MCP to get real trending data
      const response = await fetch('/api/mcp/coingecko/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'mcp_coingecko_mcp_get_search_trending',
          arguments: {}
        })
      });

      if (response.ok) {
        const data = await response.json();
        const coins = data.coins?.map((coin: any) => coin.item) || [];
        setTrendingCoins(coins.slice(0, 5));
        
        // Get BTC price for conversion
        const btcCoin = coins.find((coin: any) => coin.id === 'bitcoin');
        if (btcCoin?.data?.price) {

        }
      } else {
        throw new Error('Failed to fetch trending data');
      }
    } catch (err) {
      console.error('Error fetching trending coins:', err);
      setError('Failed to load trending coins');
      
      // Fallback to mock data
      setTrendingCoins([
        {
          id: 'spark-2',
          coin_id: 38637,
          name: 'Spark',
          symbol: 'SPK',
          market_cap_rank: 366,
          thumb: 'https://coin-images.coingecko.com/coins/images/38637/standard/Spark-Logomark-RGB.png',
          small: 'https://coin-images.coingecko.com/coins/images/38637/small/Spark-Logomark-RGB.png',
          large: 'https://coin-images.coingecko.com/coins/images/38637/large/Spark-Logomark-RGB.png',
          slug: 'spark',
          price_btc: 0.0000012478181634829683,
          score: 0,
          data: {
            price: 0.148,
            price_btc: '0.000001247818163482968',
            price_change_percentage_24h: { usd: 99.64 },
            market_cap: '$158,332,355',
            market_cap_btc: '1335.39108549051',
            total_volume: '$2,482,916,484',
            total_volume_btc: '20932.95820487266',
            sparkline: 'https://www.coingecko.com/coins/38637/sparkline.svg',
            content: null
          }
        }
      ]);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchTrendingCoins();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchTrendingCoins, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCoinClick = (coinId: string) => {
    navigate(`/coins/${coinId}`);
  };

  const formatPrice = (price: number) => {
    if (price >= 1) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(price);
    } else if (price >= 0.01) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      }).format(price);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 6,
        maximumFractionDigits: 8,
      }).format(price);
    }
  };

  const formatMarketCap = (marketCapStr: string) => {
    // Parse market cap string like "$158,332,355"
    const value = parseFloat(marketCapStr.replace(/[$,]/g, ''));
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    }
    return marketCapStr;
  };

  const getTrendingIcon = (score: number) => {
    if (score <= 3) return '🔥'; // Hot trending
    if (score <= 6) return '📈'; // Rising
    return '⭐'; // Popular
  };

  const SkeletonLoader = () => (
    <div className="animate-pulse">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 last:border-0">
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="ml-3">
              <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
          </div>
          <div className="flex flex-col items-end ml-2 flex-shrink-0">
            <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-bold text-gray-900">🔥 Trending</h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {(isLoading || isLoadingData) ? (
          <SkeletonLoader />
        ) : error ? (
          <div className="p-4 text-center">
            <div className="text-red-500 text-sm mb-2">⚠️ {error}</div>
            <button 
              onClick={fetchTrendingCoins}
              className="text-blue-600 text-sm hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : trendingCoins.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No trending data available
          </div>
        ) : (
          trendingCoins.map((coin, index) => (
            <div
              key={coin.id}
              onClick={() => handleCoinClick(coin.id)}
              className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex items-center mr-3">
                  <span className="text-lg mr-1">{getTrendingIcon(coin.score)}</span>
                  <span className="text-xs font-medium text-gray-400 w-4">
                    {index + 1}
                  </span>
                </div>
                <img
                  src={coin.thumb || coin.small}
                  alt={coin.name}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32';
                  }}
                />
                <div className="ml-3 truncate">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                      {coin.name}
                    </p>
                    <span className="ml-2 text-xs text-gray-400">
                      #{coin.market_cap_rank}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500 uppercase">{coin.symbol}</p>
                    <span className="text-xs text-gray-400">•</span>
                    <p className="text-xs text-gray-500">
                      {formatMarketCap(coin.data.market_cap)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-right ml-2 flex-shrink-0">
                <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                  {formatPrice(coin.data.price)}
                </p>
                <div className="flex items-center justify-end">
                  {coin.data.price_change_percentage_24h?.usd && (
                    <span className={`text-sm font-semibold flex items-center ${
                      coin.data.price_change_percentage_24h.usd >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <svg className={`w-3 h-3 mr-1 ${
                        coin.data.price_change_percentage_24h.usd >= 0 ? '' : 'rotate-180'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      {Math.abs(coin.data.price_change_percentage_24h.usd).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Trending based on search activity • Updated every 5 minutes
        </p>
      </div>
    </div>
  );
};

export default EnhancedTrendingCard;