import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import coingeckoService from '../../services/coingeckoService';

interface TopCategoriesProps {
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
    activeCryptocurrencies?: number;
    markets?: number;
  };
  isLoadingTrending: boolean;
  isLoadingGainers: boolean;
  isLoadingMarketData: boolean;
}

const TopCategories: FC<TopCategoriesProps> = ({
  trendingCoins,
  topGainers,
  globalMarketData,
  isLoadingTrending,
  isLoadingGainers,
  isLoadingMarketData
}) => {
  const navigate = useNavigate();
  const [btcPriceUsd, setBtcPriceUsd] = useState<number | null>(null);
  const [isLoadingBtcPrice, setIsLoadingBtcPrice] = useState(false);

  // Fetch Bitcoin price in USD
  useEffect(() => {
    const fetchBtcPrice = async () => {
      try {
        setIsLoadingBtcPrice(true);
        const bitcoinData = await coingeckoService.getCoinsMarkets({
          vs_currency: 'usd',
          ids: 'bitcoin',
          order: 'market_cap_desc',
          per_page: 1,
          page: 1
        });

        if (bitcoinData && bitcoinData.length > 0 && bitcoinData[0].current_price) {
          setBtcPriceUsd(bitcoinData[0].current_price);
        }
      } catch (error) {
        console.error('Error fetching BTC price:', error);
        // Fallback price if API fails
        setBtcPriceUsd(60000); // Approximate BTC price as fallback
      } finally {
        setIsLoadingBtcPrice(false);
      }
    };

    fetchBtcPrice();
  }, []);

  const handleCoinClick = (coinId: string) => {
    navigate(`/coins/${coinId}`);
  };

  const formatPrice = (num?: number) => {
    if (num === undefined) return 'N/A';

    try {
      // Determine appropriate decimal places based on price magnitude
      let maximumFractionDigits;
      if (num >= 1) {
        // For prices $1 and above, show up to 4 decimal places
        maximumFractionDigits = 4;
      } else if (num >= 0.01) {
        // For prices between $0.01 and $1, show up to 6 decimal places
        maximumFractionDigits = 6;
      } else if (num >= 0.0001) {
        // For prices between $0.0001 and $0.01, show up to 8 decimal places
        maximumFractionDigits = 8;
      } else {
        // For very small prices, show up to 12 decimal places
        maximumFractionDigits = 12;
      }

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: maximumFractionDigits,
      }).format(num);
    } catch (error) {
      console.error('Error formatting price:', error);
      // Fallback: show price with up to 8 decimal places
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
    }
  };

  const formatLargeNumber = (num?: number) => {
    if (num === undefined) return 'N/A';

    try {
      // For very large numbers like market cap, format without decimal places for better readability
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    } catch (error) {
      console.error('Error formatting large number:', error);
      return `$${Math.round(num).toLocaleString('en-US')}`;
    }
  };

  const formatPercentage = (num?: number) => {
    if (num === undefined) return 'N/A';
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  // Skeleton loader for cards
  const SkeletonLoader = () => (
    <div className="animate-pulse">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 last:border-0">
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="ml-2 sm:ml-3">
              <div className="h-3 sm:h-4 bg-gray-200 rounded w-16 sm:w-20"></div>
              <div className="h-2 sm:h-3 bg-gray-200 rounded w-10 sm:w-12 mt-1"></div>
            </div>
          </div>
          <div className="flex flex-col items-end ml-2 flex-shrink-0">
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-12 sm:w-16"></div>
            <div className="h-2 sm:h-3 bg-gray-200 rounded w-10 sm:w-12 mt-1"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Market Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold">Market Summary</h2>
        </div>
        <div className="p-4">
          {isLoadingMarketData ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-500">Total Market Cap</p>
                <p className="text-lg font-semibold">{formatLargeNumber(globalMarketData.totalMarketCap)}</p>
                <span className={`text-xs ${globalMarketData.marketCapChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(globalMarketData.marketCapChange24h)} (24h)
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">24h Trading Volume</p>
                <p className="text-lg font-semibold">{formatLargeNumber(globalMarketData.totalVolume)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trending Coins */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold">Trending</h2>
        </div>
        <div>
          {isLoadingTrending ? (
            <SkeletonLoader />
          ) : (
            trendingCoins.slice(0, 3).map(({ item }) => (
              <div
                key={item.id}
                onClick={() => handleCoinClick(item.id)}
                className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <img
                    src={item.thumb || item.large}
                    alt={item.name}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'; }}
                  />
                  <div className="ml-2 sm:ml-3 truncate">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 uppercase truncate">{item.symbol}</p>
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <p className="text-xs sm:text-sm font-medium whitespace-nowrap">
                    {btcPriceUsd
                      ? formatPrice(item.price_btc * btcPriceUsd)
                      : isLoadingBtcPrice
                        ? '...'
                        : `${item.price_btc.toFixed(8)} BTC`}
                  </p>
                  <p className="text-xs text-gray-500">#{item.market_cap_rank || 'N/A'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Gainers */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold">Top Gainers</h2>
        </div>
        <div>
          {isLoadingGainers && topGainers.length === 0 ? (
            <SkeletonLoader />
          ) : (
            topGainers.slice(0, 3).map((coin) => (
              <div
                key={coin.id}
                onClick={() => handleCoinClick(coin.id)}
                className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <img
                    src={coin.image}
                    alt={coin.name}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'; }}
                  />
                  <div className="ml-2 sm:ml-3 truncate">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{coin.name}</p>
                    <p className="text-xs text-gray-500 uppercase truncate">{coin.symbol}</p>
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <p className="text-xs sm:text-sm font-medium whitespace-nowrap">{formatPrice(coin.usd)}</p>
                  <p className="text-xs text-green-600 whitespace-nowrap">
                    {formatPercentage(coin.usd_24h_change)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TopCategories; 