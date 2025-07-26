import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { TrendingCoin } from '../../services/coingeckoService';
import coingeckoService from '../../services/coingeckoService';

interface TrendingCoinsProps {
  trendingCoins: Array<{ item: TrendingCoin }>;
  isLoading: boolean;
}

const TrendingCoins: FC<TrendingCoinsProps> = ({ trendingCoins, isLoading }) => {
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

  // Format price in USD - more compact for mobile
  const formatPrice = (num?: number) => {
    if (num === undefined || num === null) return 'N/A';

    // For very small values, use scientific notation on mobile
    if (num < 0.00001) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumSignificantDigits: 3
      }).format(num);
    }

    let maximumFractionDigits;
    if (num >= 1) maximumFractionDigits = 2;
    else if (num >= 0.01) maximumFractionDigits = 3;
    else if (num >= 0.0001) maximumFractionDigits = 4;
    else maximumFractionDigits = 6;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: maximumFractionDigits,
    }).format(num);
  };

  const handleCoinClick = (coinId: string) => {
    navigate(`/coins/${coinId}`);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold">Trending Coins</h2>
        </div>
        <div className="animate-pulse">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100">
              <div className="flex items-center min-w-0 flex-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="ml-2 sm:ml-3">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-16 sm:w-24"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded w-10 sm:w-16 mt-1"></div>
                </div>
              </div>
              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-12 sm:w-16"></div>
                <div className="h-2 sm:h-3 bg-gray-200 rounded w-10 sm:w-12 mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold">Trending Coins</h2>
      </div>
      <div>
        {trendingCoins.slice(0, 5).map(({ item }) => (
          <div
            key={item.id}
            onClick={() => handleCoinClick(item.id)}
            className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center min-w-0 flex-1">
              <img
                src={item.thumb || item.large}
                alt={item.name}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'; }}
              />
              <div className="ml-2 sm:ml-3 truncate">
                <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-500 truncate">{item.symbol}</div>
              </div>
            </div>
            <div className="flex flex-col items-end ml-2 flex-shrink-0">
              <div className="text-xs sm:text-sm font-medium text-amber-500">#{item.market_cap_rank || 'N/A'}</div>
              <div className="text-xs text-gray-500 whitespace-nowrap">
                {btcPriceUsd
                  ? formatPrice(item.price_btc * btcPriceUsd)
                  : isLoadingBtcPrice
                    ? 'Loading...'
                    : `${item.price_btc.toFixed(8)} BTC`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendingCoins; 