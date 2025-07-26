import type { FC } from 'react';
import type { TechnicalAnalysis } from '../../services/kemiApiService';

interface TechnicalAnalysisCardProps {
  technicalAnalysis: TechnicalAnalysis;
  coinName: string;
  currentPrice: number;
}

const TechnicalAnalysisCard: FC<TechnicalAnalysisCardProps> = ({
  technicalAnalysis
}) => {
  const { indicators, signals, summary } = technicalAnalysis;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(price);
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case 'buy':
        return 'text-green-600 bg-green-50';
      case 'sell':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'bullish':
        return 'text-green-600';
      case 'bearish':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRSIStatus = (rsi: number) => {
    if (rsi > 70) return { status: 'Overbought', color: 'text-red-600' };
    if (rsi < 30) return { status: 'Oversold', color: 'text-green-600' };
    return { status: 'Neutral', color: 'text-gray-600' };
  };

  const rsiStatus = getRSIStatus(indicators.rsi);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Technical Analysis</h2>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor(signals.recommendation)}`}>
            {signals.recommendation.toUpperCase()}
          </div>
          <div className="text-sm text-gray-500">
            Confidence: {signals.confidence.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Trend</h3>
          <p className={`text-lg font-semibold ${getTrendColor(signals.trend)}`}>
            {signals.trend.charAt(0).toUpperCase() + signals.trend.slice(1)}
          </p>
          <p className="text-sm text-gray-600">{signals.strength} strength</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Data Quality</h3>
          <p className="text-lg font-semibold text-gray-900">
            {summary.analysis_quality.charAt(0).toUpperCase() + summary.analysis_quality.slice(1)}
          </p>
          <p className="text-sm text-gray-600">{summary.data_points} data points</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Volatility</h3>
          <p className="text-lg font-semibold text-gray-900">
            {indicators.volatility.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-600">
            {indicators.volatility > 5 ? 'High' : indicators.volatility > 2 ? 'Moderate' : 'Low'} volatility
          </p>
        </div>
      </div>

      {/* Key Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Price Indicators */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Indicators</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">RSI (14)</span>
              <div className="text-right">
                <span className="font-medium">{indicators.rsi.toFixed(2)}</span>
                <span className={`ml-2 text-sm ${rsiStatus.color}`}>
                  {rsiStatus.status}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">MACD</span>
              <div className="text-right">
                <span className="font-medium">{indicators.macd.toFixed(4)}</span>
                <span className={`ml-2 text-sm ${indicators.macd > indicators.macd_signal ? 'text-green-600' : 'text-red-600'}`}>
                  {indicators.macd > indicators.macd_signal ? 'Bullish' : 'Bearish'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">SMA 20</span>
              <span className="font-medium">{formatPrice(indicators.sma_20)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">SMA 50</span>
              <span className="font-medium">{formatPrice(indicators.sma_50)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">EMA 12</span>
              <span className="font-medium">{formatPrice(indicators.ema_12)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">EMA 26</span>
              <span className="font-medium">{formatPrice(indicators.ema_26)}</span>
            </div>
          </div>
        </div>

        {/* Right Column - Support/Resistance & Bollinger Bands */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Levels</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Support</span>
              <span className="font-medium text-green-600">
                {formatPrice(indicators.support_resistance.support)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Resistance</span>
              <span className="font-medium text-red-600">
                {formatPrice(indicators.support_resistance.resistance)}
              </span>
            </div>

            <div className="border-t pt-3 mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Bollinger Bands</h4>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Upper Band</span>
                <span className="font-medium">{formatPrice(indicators.bollinger_bands.upper)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Middle Band</span>
                <span className="font-medium">{formatPrice(indicators.bollinger_bands.middle)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Lower Band</span>
                <span className="font-medium">{formatPrice(indicators.bollinger_bands.lower)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Signals */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Signals</h3>
        <div className="space-y-2">
          {signals.signals.map((signal, index) => (
            <div key={index} className="flex items-start">
              <div className="w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-gray-700 text-sm">{signal}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TechnicalAnalysisCard;