import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface GainerLoser {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number;
  usd: number;
  usd_24h_vol: number;
  usd_24h_change?: number;
  usd_1h_change?: number;
  usd_7d_change?: number;
}

interface MCPTopGainersLosersProps {
  duration?: '1h' | '24h' | '7d' | '14d' | '30d';
  showLosers?: boolean;
  maxItems?: number;
}

const MCPTopGainersLosers: FC<MCPTopGainersLosersProps> = ({ 
  duration = '24h',
  showLosers = false,
  maxItems = 5
}) => {
  const navigate = useNavigate();
  const [gainers, setGainers] = useState<GainerLoser[]>([]);
  const [losers, setLosers] = useState<GainerLoser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter out stablecoins and low-change coins
  const filterValidGainers = (coins: GainerLoser[]): GainerLoser[] => {
    const stablecoinSymbols = ['USDT', 'USDC', 'BUSD', 'DAI', 'FRAX', 'TUSD', 'USDP', 'USDE', 'FDUSD'];
    const stablecoinNames = ['Tether', 'USD Coin', 'Binance USD', 'Dai', 'Frax', 'TrueUSD', 'Pax Dollar', 'Ethena USDe', 'First Digital USD'];
    
    return coins.filter(coin => {
      // Filter out stablecoins by symbol
      if (stablecoinSymbols.includes(coin.symbol.toUpperCase())) {
        return false;
      }
      
      // Filter out stablecoins by name
      if (stablecoinNames.some(name => coin.name.toLowerCase().includes(name.toLowerCase()))) {
        return false;
      }
      
      // Filter out coins with very low change (likely stablecoins or errors)
      const changeValue = getChangeValue(coin);
      if (changeValue !== undefined && Math.abs(changeValue) < 1) {
        return false;
      }
      
      // Filter out coins with suspicious price patterns (exactly $1.00 often indicates stablecoins)
      if (coin.usd === 1.0 || (coin.usd > 0.999 && coin.usd < 1.001)) {
        return false;
      }
      
      return true;
    });
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the MCP tool directly
      const response = await window.mcpCoingecko?.getTopGainersLosers?.({
        duration,
        vs_currency: 'usd',
        top_coins: '1000'
      });

      if (response) {
        // Filter and get the best gainers/losers
        const filteredGainers = filterValidGainers(response.top_gainers || []);
        const filteredLosers = response.top_losers || [];
        
        setGainers(filteredGainers.slice(0, maxItems));
        setLosers(filteredLosers.slice(0, maxItems));
        setLastUpdated(new Date());
        
        console.log('🚀 Filtered gainers:', filteredGainers.slice(0, 3).map(c => `${c.name}: ${getChangeValue(c)}%`));
      } else {
        throw new Error('No data received from MCP');
      }
    } catch (err) {
      console.error('Error fetching MCP gainers/losers:', err);
      setError('Failed to load data');
      
      // Fallback to mock data for demo
      const mockGainers: GainerLoser[] = [
        {
          id: 'zora',
          symbol: 'ZORA',
          name: 'Zora',
          image: 'https://coin-images.coingecko.com/coins/images/54693/small/zora.jpg',
          market_cap_rank: 368,
          usd: 0.0497,
          usd_24h_vol: 406060836,
          usd_24h_change: 126.97
        },
        {
          id: 'spark-2',
          symbol: 'SPK',
          name: 'Spark',
          image: 'https://coin-images.coingecko.com/coins/images/38637/small/Spark-Logomark-RGB.png',
          market_cap_rank: 353,
          usd: 0.1614,
          usd_24h_vol: 2641616150,
          usd_24h_change: 117.19
        }
      ];
      
      setGainers(mockGainers.slice(0, maxItems));
      setLosers([]); // Empty for demo
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh based on duration
    const refreshInterval = duration === '1h' ? 60000 : // 1 minute for 1h data
                           duration === '24h' ? 120000 : // 2 minutes for 24h data
                           300000; // 5 minutes for longer periods
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [duration, maxItems]);

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

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) {
      return `$${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
      return `$${(volume / 1e6).toFixed(2)}M`;
    } else if (volume >= 1e3) {
      return `$${(volume / 1e3).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  };

  const formatPercentage = (change: number, isGainer: boolean = true) => {
    const sign = isGainer ? '+' : '';
    return `${sign}${Math.abs(change).toFixed(2)}%`;
  };

  const getChangeValue = (coin: GainerLoser) => {
    switch (duration) {
      case '1h': return coin.usd_1h_change;
      case '7d': return coin.usd_7d_change;
      default: return coin.usd_24h_change;
    }
  };

  const getDurationLabel = () => {
    switch (duration) {
      case '1h': return '1H';
      case '7d': return '7D';
      case '14d': return '14D';
      case '30d': return '30D';
      default: return '24H';
    }
  };

  const getIcon = (isGainer: boolean) => {
    return isGainer ? '🚀' : '📉';
  };

  const getColorClass = (isGainer: boolean) => {
    return isGainer ? 'text-green-600' : 'text-red-600';
  };

  const SkeletonLoader = () => (
    <div className="animate-pulse">
      {[...Array(maxItems)].map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
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

  const renderCoinList = (coins: GainerLoser[], isGainer: boolean) => (
    <div className="max-h-80 overflow-y-auto">
      {coins.map((coin, index) => {
        const changeValue = getChangeValue(coin);
        return (
          <div
            key={coin.id}
            onClick={() => handleCoinClick(coin.id)}
            className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors group"
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex items-center mr-3">
                <span className="text-lg mr-1">{getIcon(isGainer)}</span>
                <span className="text-xs font-medium text-gray-400 w-4">
                  {index + 1}
                </span>
              </div>
              <img
                src={coin.image}
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
                    Vol: {formatVolume(coin.usd_24h_vol)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-right ml-2 flex-shrink-0">
              <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {formatPrice(coin.usd)}
              </p>
              <div className="flex items-center justify-end">
                {changeValue !== undefined && (
                  <span className={`text-sm font-semibold flex items-center ${getColorClass(isGainer)}`}>
                    <svg className={`w-3 h-3 mr-1 ${!isGainer ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {formatPercentage(changeValue, isGainer)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Gainers */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-bold text-gray-900">🚀 Top Gainers ({getDurationLabel()})</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live MCP</span>
          </div>
        </div>
        
        {isLoading ? (
          <SkeletonLoader />
        ) : error ? (
          <div className="p-4 text-center">
            <div className="text-red-500 text-sm mb-2">⚠️ {error}</div>
            <button 
              onClick={fetchData}
              className="text-blue-600 text-sm hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : gainers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No gainers data available
          </div>
        ) : (
          renderCoinList(gainers, true)
        )}
        
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'} • 
            Powered by CoinGecko MCP
          </p>
        </div>
      </div>

      {/* Top Losers */}
      {showLosers && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">📉 Top Losers ({getDurationLabel()})</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Live MCP</span>
            </div>
          </div>
          
          {isLoading ? (
            <SkeletonLoader />
          ) : error ? (
            <div className="p-4 text-center">
              <div className="text-red-500 text-sm mb-2">⚠️ {error}</div>
              <button 
                onClick={fetchData}
                className="text-blue-600 text-sm hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : losers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No losers data available
            </div>
          ) : (
            renderCoinList(losers, false)
          )}
          
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'} • 
              Powered by CoinGecko MCP
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPTopGainersLosers;

// Type declarations are now centralized in mcpCoingeckoService.ts