import type { FC } from 'react';
import type { MarketData } from '../../services/kemiApiService';

interface MarketDataCardProps {
  marketData: MarketData;
  coinName: string;
}

const MarketDataCard: FC<MarketDataCardProps> = ({ marketData }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(price);
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `$${(num / 1e3).toFixed(2)}K`;
    }
    return formatPrice(num);
  };

  const formatSupply = (supply: number) => {
    if (supply >= 1e12) {
      return `${(supply / 1e12).toFixed(2)}T`;
    } else if (supply >= 1e9) {
      return `${(supply / 1e9).toFixed(2)}B`;
    } else if (supply >= 1e6) {
      return `${(supply / 1e6).toFixed(2)}M`;
    } else if (supply >= 1e3) {
      return `${(supply / 1e3).toFixed(2)}K`;
    }
    return new Intl.NumberFormat('en-US').format(supply);
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const getPercentageColor = (percentage: number) => {
    return percentage >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Market Data Overview</h2>
      
      {/* Price Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Current Price</h3>
          <p className="text-3xl font-bold text-gray-900">{formatPrice(marketData.current_price)}</p>
          <div className="mt-2">
            <span className={`text-sm font-medium ${getPercentageColor(marketData.price_change_24h)}`}>
              {formatPercentage(marketData.price_change_24h)} (24h)
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Market Cap</h3>
          <p className="text-2xl font-bold text-gray-900">{formatLargeNumber(marketData.market_cap)}</p>
          <p className="text-sm text-gray-600 mt-1">Total market value</p>
        </div>
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">7 Day Change</h3>
          <p className={`text-lg font-semibold ${getPercentageColor(marketData.price_change_7d)}`}>
            {formatPercentage(marketData.price_change_7d)}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">30 Day Change</h3>
          <p className={`text-lg font-semibold ${getPercentageColor(marketData.price_change_30d)}`}>
            {formatPercentage(marketData.price_change_30d)}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">24h Volume</h3>
          <p className="text-lg font-semibold text-gray-900">
            {formatLargeNumber(marketData.total_volume)}
          </p>
        </div>
      </div>

      {/* Supply Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Supply Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Circulating Supply</span>
              <span className="font-medium">{formatSupply(marketData.circulating_supply)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Supply</span>
              <span className="font-medium">
                {marketData.total_supply ? formatSupply(marketData.total_supply) : 'N/A'}
              </span>
            </div>

            {marketData.total_supply && (
              <div className="mt-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Supply Progress</span>
                  <span>{((marketData.circulating_supply / marketData.total_supply) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-black h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min((marketData.circulating_supply / marketData.total_supply) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Price Extremes</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">All-Time High</span>
              <div className="text-right">
                <span className="font-medium text-green-600">{formatPrice(marketData.ath)}</span>
                <div className="text-xs text-gray-500">
                  {((marketData.current_price / marketData.ath - 1) * 100).toFixed(1)}% from ATH
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">All-Time Low</span>
              <div className="text-right">
                <span className="font-medium text-red-600">{formatPrice(marketData.atl)}</span>
                <div className="text-xs text-gray-500">
                  {((marketData.current_price / marketData.atl - 1) * 100).toFixed(0)}% from ATL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Cap Breakdown */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Market Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Price per Token</p>
            <p className="font-semibold">{formatPrice(marketData.current_price)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Market Cap</p>
            <p className="font-semibold">{formatLargeNumber(marketData.market_cap)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Volume/MCap</p>
            <p className="font-semibold">
              {((marketData.total_volume / marketData.market_cap) * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tokens in Circulation</p>
            <p className="font-semibold">{formatSupply(marketData.circulating_supply)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDataCard;