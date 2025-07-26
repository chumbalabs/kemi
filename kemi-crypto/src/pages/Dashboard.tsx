import type { FC } from 'react';
import CoinTable from '../components/dashboard/CoinTable';
import TopCategories from '../components/dashboard/TopCategories';

import ErrorBoundary from '../components/ErrorBoundary';
import { useKemiData } from '../hooks/useKemiData';

const Dashboard: FC = () => {
  // Get API key from environment variables (hidden from users)
  const defaultCoinGeckoApiKey = import.meta.env.VITE_COINGECKO_API_KEY || '';

  const {
    trendingCoins,
    topCoins,
    topGainers,
    globalMarketData,
    error,
    isLoadingTrending,
    isLoadingCoins,
    isLoadingGainers,
    isLoadingMarketData,
    coinsPerPage,
    totalPages,
    currentPage,
    setCoinsPerPage,
    setCurrentPage,
    refreshData,
  } = useKemiData({
    apiKey: defaultCoinGeckoApiKey
  });

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cryptocurrency Dashboard</h1>
        <p className="text-gray-600">Real-time market data and analysis</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-800 text-white p-3 rounded mb-4 flex items-center justify-between">
          <span>Error: {error}</span>
          <button
            onClick={refreshData}
            className="ml-4 px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Top Categories */}
      <ErrorBoundary>
        <TopCategories 
          trendingCoins={trendingCoins}
          topGainers={topGainers}
          globalMarketData={globalMarketData}
          isLoadingTrending={isLoadingTrending}
          isLoadingGainers={isLoadingGainers}
          isLoadingMarketData={isLoadingMarketData}
        />
      </ErrorBoundary>
      
      {/* Main Coin Table */}
      <ErrorBoundary>
        <CoinTable 
          coins={topCoins} 
          isLoading={isLoadingCoins}
          coinsPerPage={coinsPerPage}
          totalPages={totalPages}
          currentPage={currentPage}
          setCoinsPerPage={setCoinsPerPage}
          setCurrentPage={setCurrentPage}
        />
      </ErrorBoundary>
    </>
  );
};

export default Dashboard; 