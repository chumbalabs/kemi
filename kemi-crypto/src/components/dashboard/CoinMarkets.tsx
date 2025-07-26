import type { FC } from 'react';
import type { Coin } from '../../services/coingeckoService';

interface CoinMarketsProps {
  coins: Coin[];
  isLoading: boolean;
}

const CoinMarkets: FC<CoinMarketsProps> = ({ coins, isLoading }) => {
  const formatNumber = (num?: number) => {
    if (num === undefined) return 'N/A';
    
    // Format as currency if less than 1 million
    if (num < 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
    
    // Format as millions/billions/trillions
    const tiers = [
      { value: 1e12, symbol: 'T' },
      { value: 1e9, symbol: 'B' },
      { value: 1e6, symbol: 'M' },
    ];
    
    const tier = tiers.find(t => num >= t.value);
    
    if (tier) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num / tier.value) + tier.symbol;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };
  
  const formatPercentage = (num?: number) => {
    if (num === undefined) return 'N/A';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };
  
  if (isLoading) {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Top Cryptocurrencies</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="animate-pulse">
            {[...Array(10)].map((_, index) => (
              <div key={index} className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-12 mt-1"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">Top Cryptocurrencies</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 border-b border-gray-200 text-sm font-medium">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-3">Coin</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-1 text-right">1h</div>
          <div className="col-span-1 text-right">24h</div>
          <div className="col-span-1 text-right">7d</div>
          <div className="col-span-2 text-right">24h Volume</div>
          <div className="col-span-1 text-right">Market Cap</div>
        </div>
        
        {/* Coins list */}
        {coins.map((coin, index) => (
          <div 
            key={coin.id} 
            className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-200 hover:bg-gray-50 items-center"
          >
            <div className="col-span-1 text-center text-sm text-gray-500">{coin.market_cap_rank || index + 1}</div>
            
            <div className="col-span-3 flex items-center">
              <img 
                src={coin.image} 
                alt={coin.name} 
                className="w-6 h-6 mr-2" 
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/30'; }} 
              />
              <div>
                <div className="font-medium">{coin.name}</div>
                <div className="text-xs text-gray-500 uppercase">{coin.symbol}</div>
              </div>
            </div>
            
            <div className="col-span-2 text-right font-medium">
              {formatNumber(coin.current_price)}
            </div>
            
            <div className={`col-span-1 text-right text-sm ${coin.price_change_percentage_1h_in_currency && coin.price_change_percentage_1h_in_currency >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(coin.price_change_percentage_1h_in_currency)}
            </div>
            
            <div className={`col-span-1 text-right text-sm ${coin.price_change_percentage_24h && coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(coin.price_change_percentage_24h)}
            </div>
            
            <div className={`col-span-1 text-right text-sm ${coin.price_change_percentage_7d_in_currency && coin.price_change_percentage_7d_in_currency >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(coin.price_change_percentage_7d_in_currency)}
            </div>
            
            <div className="col-span-2 text-right text-sm text-gray-600">
              {formatNumber(coin.total_volume)}
            </div>
            
            <div className="col-span-1 text-right text-sm text-gray-600">
              {formatNumber(coin.market_cap)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoinMarkets; 