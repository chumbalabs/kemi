import type { FC } from 'react';
import { useState } from 'react';

interface CacheStatusProps {
  getCacheStats: () => any;
  clearCache: () => void;
  refreshData: () => void;
}

const CacheStatus: FC<CacheStatusProps> = ({ getCacheStats, clearCache, refreshData }) => {
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleShowStats = () => {
    const currentStats = getCacheStats();
    setStats(currentStats);
    setShowStats(!showStats);
  };

  const handleClearCache = () => {
    clearCache();
    setStats(null);
    setShowStats(false);
  };

  const handleRefresh = () => {
    refreshData();
    setShowStats(false);
  };

  return (
    <div className="relative">
      {/* Cache Control Button */}
      <button
        onClick={handleShowStats}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Cache Status & Controls"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4-1.79 4-4M4 7h16m-1 4l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span>Cache</span>
      </button>

      {/* Dropdown Panel */}
      {showStats && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Cache Status</h3>
              <button
                onClick={() => setShowStats(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {stats && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Memory Cache:</span>
                  <span className="font-medium">{stats.memoryCache} items</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Local Storage:</span>
                  <span className="font-medium">{stats.localStorage} items</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Storage Size:</span>
                  <span className="font-medium">{(stats.totalSize / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                🔄 Refresh Data
              </button>
              <button
                onClick={handleClearCache}
                className="flex-1 px-3 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                🗑️ Clear Cache
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                💡 Data is cached for faster loading. Cache automatically refreshes every 5-15 minutes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheStatus;