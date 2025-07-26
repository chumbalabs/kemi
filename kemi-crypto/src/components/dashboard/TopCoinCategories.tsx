import type { FC } from 'react';
import type { Coin, TrendingCoin } from '../../services/coingeckoService';

interface TopCoinCategoriesProps {
  trendingCoins: Array<{ item: TrendingCoin }>;
  topGainers: Coin[];
  isLoadingTrending: boolean;
  isLoadingGainers: boolean;
}

const TopCoinCategories: FC<TopCoinCategoriesProps> = ({ 
  trendingCoins, 
  topGainers, 
  isLoadingTrending, 
  isLoadingGainers 
}) => {
  const formatPrice = (num?: number) => {
    if (num === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(num);
  };
  
  const formatPercentage = (num?: number) => {
    if (num === undefined) return 'N/A';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };
  
  // Skeleton loader for categories
  const SkeletonLoader = () => (
    <div className="animate-pulse">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 border-b border-gray-200 last:border-0">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="ml-3">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-3 bg-gray-200 rounded w-12 mt-1"></div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-200 rounded w-12 mt-1"></div>
          </div>
        </div>
      ))}
    </div>
  );
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {/* Market Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-bold">Market Summary</h2>
        </div>
        <div className="p-4">
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Market Cap</p>
              <p className="text-lg font-semibold">$4,019,386,826,712</p>
              <span className="text-xs text-green-600">+2.8%</span>
            </div>
            <div className="w-24 h-12">
              {/* Small chart placeholder */}
              <div className="w-full h-full bg-gradient-to-r from-gray-50 to-gray-100 rounded"></div>
            </div>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">24h Trading Volume</p>
              <p className="text-lg font-semibold">$236,182,057,778</p>
            </div>
            <div className="w-24 h-12">
              {/* Small chart placeholder */}
              <div className="w-full h-full bg-gradient-to-r from-gray-50 to-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trending Coins */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <h2 className="font-bold">Trending</h2>
          <a href="#" className="text-xs text-gray-500 hover:text-gray-700">View more</a>
        </div>
        <div>
          {isLoadingTrending ? (
            <SkeletonLoader />
          ) : (
            trendingCoins.slice(0, 3).map(({ item }) => (
              <div key={item.id} className="flex items-center justify-between p-3 border-b border-gray-200 last:border-0">
                <div className="flex items-center">
                  <img 
                    src={item.thumb || item.large} 
                    alt={item.name} 
                    className="w-8 h-8 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'; }}
                  />
                  <div className="ml-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500 uppercase">{item.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.price_btc.toFixed(8)} BTC</p>
                  <p className="text-xs text-gray-500">Rank #{item.market_cap_rank || 'N/A'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Top Gainers */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <h2 className="font-bold">Top Gainers</h2>
          <a href="#" className="text-xs text-gray-500 hover:text-gray-700">View more</a>
        </div>
        <div>
          {isLoadingGainers ? (
            <SkeletonLoader />
          ) : (
            topGainers.slice(0, 3).map((coin) => (
              <div key={coin.id} className="flex items-center justify-between p-3 border-b border-gray-200 last:border-0">
                <div className="flex items-center">
                  <img 
                    src={coin.image} 
                    alt={coin.name} 
                    className="w-8 h-8 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32'; }}
                  />
                  <div className="ml-3">
                    <p className="font-medium">{coin.name}</p>
                    <p className="text-xs text-gray-500 uppercase">{coin.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(coin.current_price)}</p>
                  <p className="text-xs text-green-600">
                    {formatPercentage(coin.price_change_percentage_24h)}
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

export default TopCoinCategories; 