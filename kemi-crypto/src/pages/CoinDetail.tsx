import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import coingeckoService from '../services/coingeckoService';
import kemiApiService from '../services/kemiApiService';
import type { Coin, ChartDataPoint } from '../services/coingeckoService';
import type { CoinAnalysisResponse } from '../services/kemiApiService';
import PriceChart from '../components/charts/PriceChart';
import Header from '../header';
import Footer from '../footer';
import AiAnalysisCard from '../components/dashboard/AiAnalysisCard';
import TechnicalAnalysisCard from '../components/dashboard/TechnicalAnalysisCard';
import MarketDataCard from '../components/dashboard/MarketDataCard';

interface CoinDetailData extends Coin {
  description?: string;
  market_cap_rank?: number;
  market_data?: {
    ath?: { usd?: number };
    atl?: { usd?: number };
    ath_change_percentage?: { usd?: number };
    atl_change_percentage?: { usd?: number };
    price_change_24h?: number;
    price_change_percentage_24h?: number;
    price_change_percentage_7d?: number;
    price_change_percentage_30d?: number;
    price_change_percentage_1y?: number;
  };
  links?: {
    homepage?: string[];
    blockchain_site?: string[];
    official_forum_url?: string[];
  };
}

type TimeRange = '24h' | '7d' | '1m' | '1y';

// Helper function to suggest common coin ID variations (local copy)
const getLocalCoinSuggestions = (coinId: string): string[] => {
  const suggestions: string[] = [];
  const lowerCoinId = coinId.toLowerCase();
  
  // Common variations for known coins
  const commonVariations: { [key: string]: string[] } = {
    'mantra': ['mantra-dao'],
    'dao': ['mantra-dao'],
    'om': ['mantra-dao'],
    'bitcoin': ['bitcoin'],
    'eth': ['ethereum'],
    'bnb': ['binancecoin'],
    'ada': ['cardano'],
    'dot': ['polkadot'],
    'sol': ['solana'],
    'matic': ['matic-network'],
    'polygon': ['matic-network'],
    'avax': ['avalanche-2'],
    'avalanche': ['avalanche-2'],
  };
  
  // Check for exact matches in our variations
  if (commonVariations[lowerCoinId]) {
    suggestions.push(...commonVariations[lowerCoinId]);
  }
  
  return suggestions;
};

const CoinDetail: FC = () => {
  const { coinId } = useParams<{ coinId: string }>();
  const [coinData, setCoinData] = useState<Coin | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coinNotFound, setCoinNotFound] = useState(false);
  const [suggestedCoinIds, setSuggestedCoinIds] = useState<string[]>([]);
  const [coinAnalysis, setCoinAnalysis] = useState<CoinAnalysisResponse | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const timeRanges: { key: TimeRange; label: string; days: number }[] = [
    { key: '24h', label: '24H', days: 1 },
    { key: '7d', label: '7D', days: 7 },
    { key: '1m', label: '1M', days: 30 },
    { key: '1y', label: '1Y', days: 365 },
  ];

  useEffect(() => {
    if (!coinId) return;
    fetchCoinData();
  }, [coinId]);

  useEffect(() => {
    if (!coinId) return;
    fetchChartData();
  }, [coinId, selectedTimeRange]);

  useEffect(() => {
    if (!coinId) return;
    fetchCoinAnalysis();
  }, [coinId]);

  const fetchCoinAnalysis = async () => {
    try {
      setIsLoadingAnalysis(true);
      setAnalysisError(null);
      
      const analysis = await kemiApiService.getCoinAnalysis(coinId!);
      setCoinAnalysis(analysis);
    } catch (err) {
      console.error('Error fetching coin analysis:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const fetchCoinData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setCoinNotFound(false);
      setSuggestedCoinIds([]);
      
      // For now, we'll use the markets endpoint to get basic coin data
      // In a real implementation, you'd use the coins/{id} endpoint for detailed data
      const response = await coingeckoService.getCoinsMarkets({
        vs_currency: 'usd',
        ids: coinId,
        order: 'market_cap_desc',
        per_page: 1,
        page: 1,
        price_change_percentage: '1h,24h,7d,30d,1y'
      });

      if (response && response.length > 0) {
        setCoinData(response[0] as CoinDetailData);
      } else {
        setError('Coin not found');
        setCoinNotFound(true);
      }
    } catch (err) {
      console.error('Error fetching coin data:', err);
      
      if (err instanceof Error && err.message.startsWith('COIN_NOT_FOUND')) {
        setCoinNotFound(true);
        setError(`The coin "${coinId}" was not found in the CoinGecko database.`);
        
        // Extract suggestions from console logs (this is a simple approach)
        // In a real implementation, you'd want to import the suggestion function directly
        const commonSuggestions = getLocalCoinSuggestions(coinId || '');
        if (commonSuggestions.length > 0) {
          setSuggestedCoinIds(commonSuggestions);
        }
      } else {
        setError('Failed to load coin data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const timeRange = timeRanges.find(t => t.key === selectedTimeRange);
      if (!timeRange || !coinId) return;

      console.log(`Fetching ${selectedTimeRange} chart data for ${coinId} (${timeRange.days} days)`);

      // Fetch real historical data from CoinGecko
      const historicalData = await coingeckoService.getHistoricalChartData(
        coinId,
        'usd',
        timeRange.days
      );
      
      console.log(`Received ${historicalData.length} data points for ${selectedTimeRange}`);
      
      if (historicalData.length > 0) {
        setChartData(historicalData);
      } else {
        // If no data returned, use mock data
        console.log(`No data returned for ${selectedTimeRange}, using mock data`);
        const mockPrices = generateMockChartData(coinData?.current_price || 0, timeRange.days);
        setChartData(mockPrices);
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
      // Fallback to mock data if API fails
      const timeRange = timeRanges.find(t => t.key === selectedTimeRange);
      if (timeRange) {
        console.log(`Using mock data for ${selectedTimeRange} due to error`);
        const mockPrices = generateMockChartData(coinData?.current_price || 0, timeRange.days);
        setChartData(mockPrices);
      }
    }
  };

  const generateMockChartData = (basePrice: number, days: number): ChartDataPoint[] => {
    const dataPoints = days === 1 ? 24 : days * 2; // Hourly for 24h, twice daily for others
    const data: ChartDataPoint[] = [];
    let currentPrice = basePrice;
    
    for (let i = 0; i < dataPoints; i++) {
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      currentPrice = currentPrice * (1 + change);
      data.push({
        timestamp: Date.now() - (dataPoints - i) * (days === 1 ? 3600000 : 43200000), // 1 hour or 12 hours
        price: currentPrice
      });
    }
    return data;
  };

  const formatPrice = (num?: number) => {
    if (num === undefined || num === null) return 'N/A';
    
    let maximumFractionDigits;
    if (num >= 1) maximumFractionDigits = 4;
    else if (num >= 0.01) maximumFractionDigits = 6;
    else if (num >= 0.0001) maximumFractionDigits = 8;
    else maximumFractionDigits = 12;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: maximumFractionDigits,
    }).format(num);
  };

  const formatLargeNumber = (num?: number) => {
    if (num === undefined || num === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercentage = (num?: number) => {
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header - Using modular component */}
        <Header />

        {/* Loading Content */}
        <main className="container mx-auto px-4 pt-20 pb-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded mb-8"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !coinData) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header - Using modular component */}
        <Header />

        {/* Error Content */}
        <main className="container mx-auto px-4 pt-20 pb-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {coinNotFound ? 'Coin Not Found' : 'Error Loading Coin'}
            </h2>
            <p className="text-gray-600 mb-4">{error || 'The requested cryptocurrency could not be found.'}</p>
            
            {/* Show suggestions if available */}
            {coinNotFound && suggestedCoinIds.length > 0 && (
              <div className="mb-6">
                <p className="text-gray-700 mb-3">Did you mean one of these instead?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedCoinIds.map((suggestedId) => (
                    <Link
                      key={suggestedId}
                      to={`/coins/${suggestedId}`}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    >
                      {suggestedId}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Using modular component */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-20 pb-6 max-w-6xl">
        {/* Coin Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <img 
              src={coinAnalysis?.coin_info.image.large || coinData.image} 
              alt={coinAnalysis?.coin_info.name || coinData.name} 
              className="w-12 h-12 rounded-full mr-4"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48'; }}
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {coinAnalysis?.coin_info.name || coinData.name} ({(coinAnalysis?.coin_info.symbol || coinData.symbol)?.toUpperCase()}) 
                <span className="text-sm text-gray-500 font-normal ml-2">
                  Rank #{coinAnalysis?.coin_info.market_cap_rank || coinData.market_cap_rank || 'N/A'}
                </span>
              </h1>
            </div>
          </div>

          {/* Price and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Current Price</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(coinAnalysis?.market_data.current_price || coinData.current_price)}
              </p>
              <span className={`text-sm ${(coinAnalysis?.market_data.price_change_24h || coinData.price_change_percentage_24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(coinAnalysis?.market_data.price_change_24h || coinData.price_change_percentage_24h || 0)} (24h)
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Market Cap</h3>
              <p className="text-xl font-bold text-gray-900">
                {formatLargeNumber(coinAnalysis?.market_data.market_cap || coinData.market_cap || 0)}
              </p>
              <span className="text-sm text-gray-600">
                #{coinAnalysis?.coin_info.market_cap_rank || coinData.market_cap_rank || 'N/A'}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">24h Volume</h3>
              <p className="text-xl font-bold text-gray-900">
                {formatLargeNumber(coinAnalysis?.market_data.total_volume || coinData.total_volume || 0)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Circulating Supply</h3>
              <p className="text-xl font-bold text-gray-900">
                {coinAnalysis?.market_data.circulating_supply 
                  ? new Intl.NumberFormat('en-US').format(coinAnalysis.market_data.circulating_supply)
                  : (coinData as any)?.circulating_supply 
                    ? new Intl.NumberFormat('en-US').format((coinData as any).circulating_supply)
                    : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Price Chart</h2>
              
              {/* Time Range Selector */}
              <div className="flex space-x-2">
                {timeRanges.map((range) => (
                  <button
                    key={range.key}
                    onClick={() => setSelectedTimeRange(range.key)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      selectedTimeRange === range.key
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Placeholder */}
            {chartData.length > 0 ? (
              <PriceChart
                data={chartData}
                coinName={coinData.name}
                coinSymbol={coinData.symbol || ''}
                timeRange={selectedTimeRange}
              />
            ) : (
              <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-500">Loading {selectedTimeRange.toUpperCase()} chart data...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Cards */}
        {coinAnalysis && (
          <div className="space-y-8">
            {/* Market Data Card */}
            <MarketDataCard 
              marketData={coinAnalysis.market_data} 
              coinName={coinAnalysis.coin_info.name}
            />

            {/* Technical Analysis Card */}
            <TechnicalAnalysisCard 
              technicalAnalysis={coinAnalysis.technical_analysis}
              coinName={coinAnalysis.coin_info.name}
              currentPrice={coinAnalysis.market_data.current_price}
            />

            {/* AI Analysis Card */}
            <AiAnalysisCard 
              aiAnalysis={coinAnalysis.ai_analysis}
              isLoading={isLoadingAnalysis}
              coinName={coinAnalysis.coin_info.name}
            />
          </div>
        )}

        {/* Loading State for Analysis */}
        {isLoadingAnalysis && !coinAnalysis && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State for Analysis */}
        {analysisError && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="text-center py-8">
              <div className="text-red-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Unavailable</h3>
              <p className="text-gray-600 mb-4">{analysisError}</p>
              <button
                onClick={fetchCoinAnalysis}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>
      {/* Footer - Using modular component */}
      <Footer />
    </div>
  );
};

export default CoinDetail; 