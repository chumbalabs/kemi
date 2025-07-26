import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Coin } from '../../services/coingeckoService';

interface CoinTableProps {
  coins: Coin[];
  isLoading: boolean;
  coinsPerPage: number;
  totalPages: number;
  currentPage: number;
  setCoinsPerPage: (perPage: number) => void;
  setCurrentPage: (page: number) => void;
}

const CoinTable: FC<CoinTableProps> = ({ 
  coins, 
  isLoading, 
  coinsPerPage, 
  totalPages, 
  currentPage, 
  setCoinsPerPage, 
  setCurrentPage 
}) => {
  const navigate = useNavigate();

  // Debug logging (only in development)
  if (import.meta.env.DEV) {
    console.log('CoinTable render:', { 
      coinsLength: coins?.length || 0, 
      isLoading, 
      firstCoin: coins?.[0] 
    });
  }

  const handleRowClick = (coinId: string) => {
    navigate(`/coins/${coinId}`);
  };

  const formatPrice = (num?: number) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    
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
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    
    try {
      // For large numbers like market cap and volume, format without decimal places
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
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    try {
      return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
    } catch (error) {
      console.error('Error formatting percentage:', error);
      return 'N/A';
    }
  };
  
  // Add safety check for coins array
  const safeCoins = Array.isArray(coins) ? coins : [];
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Top Cryptocurrencies</h2>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            {[...Array(10)].map((_, index) => (
              <div key={index} className="h-16 bg-gray-100 rounded mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Handle empty state
  if (safeCoins.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Top Cryptocurrencies</h2>
          <div className="text-center py-8 text-gray-500">
            <p>No cryptocurrency data available</p>
            <p className="text-sm mt-2">Please check your API key or try again later</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Top Cryptocurrencies</h2>
          
          {/* Pagination Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="coinsPerPage" className="text-sm text-gray-600">Show:</label>
              <select
                id="coinsPerPage"
                value={coinsPerPage}
                onChange={(e) => {
                  setCoinsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing per page
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coin</th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">1h</th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">24h</th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">7d</th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">24h Volume</th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Market Cap</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safeCoins.map((coin, index) => {
                // Add safety checks for required properties
                if (!coin || !coin.id) {
                  console.warn(`Invalid coin data at index ${index}:`, coin);
                  return null;
                }
                
                return (
                  <tr 
                    key={coin.id} 
                    onClick={() => handleRowClick(coin.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {coin.market_cap_rank || 'N/A'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img 
                          src={coin.image || 'https://via.placeholder.com/24'} 
                          alt={coin.name || 'Unknown'} 
                          className="w-6 h-6 rounded-full"
                          onError={(e) => { 
                            const target = e.target as HTMLImageElement;
                            if (target.src !== 'https://via.placeholder.com/24') {
                              target.src = 'https://via.placeholder.com/24';
                            }
                          }}
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {coin.name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {coin.symbol ? coin.symbol.toUpperCase() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatPrice(coin.current_price)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`${coin.price_change_percentage_1h_in_currency && coin.price_change_percentage_1h_in_currency >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'}`}>
                        {formatPercentage(coin.price_change_percentage_1h_in_currency)}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`${coin.price_change_percentage_24h && coin.price_change_percentage_24h >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'}`}>
                        {formatPercentage(coin.price_change_percentage_24h)}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`${coin.price_change_percentage_7d_in_currency && coin.price_change_percentage_7d_in_currency >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'}`}>
                        {formatPercentage(coin.price_change_percentage_7d_in_currency)}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {formatLargeNumber(coin.total_volume)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {formatLargeNumber(coin.market_cap)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Bottom Pagination */}
        <div className="flex justify-center items-center mt-4 space-x-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoinTable; 