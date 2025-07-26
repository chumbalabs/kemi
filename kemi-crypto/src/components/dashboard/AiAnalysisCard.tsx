import type { FC } from 'react';
import type { AIAnalysis } from '../../services/kemiApiService';

interface AiAnalysisCardProps {
  aiAnalysis?: AIAnalysis;
  analysisText?: string; // Fallback for old usage
  isLoading: boolean;
  coinName?: string;
}

const AiAnalysisCard: FC<AiAnalysisCardProps> = ({
  aiAnalysis,
  analysisText,
  isLoading,
  coinName
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            AI Market Analysis {coinName && `for ${coinName}`}
          </h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-3/5"></div>
        </div>
      </div>
    );
  }

  const analysis = aiAnalysis?.analysis || analysisText;
  const recommendation = aiAnalysis?.recommendation;
  const confidence = aiAnalysis?.confidence;

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          AI Market Analysis {coinName && `for ${coinName}`}
        </h2>
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-gray-600 text-lg font-medium">No AI analysis available at the moment.</p>
          <p className="text-sm text-gray-500 mt-2">
            Please check your API configuration or try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const getRecommendationColor = (rec?: string) => {
    if (!rec) return 'text-gray-700 bg-gray-100 border-gray-200';
    switch (rec.toLowerCase()) {
      case 'buy':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'sell':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    }
  };

  // Format the analysis text for better display
  const formatAnalysisText = (text: string) => {
    // First, properly handle escaped newlines from JSON
    let cleanText = text
      .replace(/\\n/g, '\n') // Convert escaped newlines to actual newlines
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
      .replace(/^\s*[-•]\s*/gm, '• '); // Normalize bullet points

    // Split by sections (lines starting with ##)
    const sections = cleanText.split(/(?=##\s)/g).filter(section => section.trim());

    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0];
      const content = lines.slice(1).join('\n').trim();

      // Check if this is a section header
      if (title.startsWith('##')) {
        const cleanTitle = title.replace(/^##\s*/, '').replace(/📊|🔍|🎯|⚠️|📈|💡/g, '').trim();
        const emoji = title.match(/📊|🔍|🎯|⚠️|📈|💡/)?.[0] || '';

        return (
          <div key={index} className="mb-8">
            <div className="bg-white p-6 border-l-4 border-black">
              <h3 className="text-xl font-bold text-black mb-5 flex items-start">
                {emoji && <span className="mr-3 text-2xl">{emoji}</span>}
                {cleanTitle}
              </h3>
              <div className="text-black leading-relaxed space-y-4">
                {content.split('\n\n').map((paragraph, paragraphIndex) => {
                  if (!paragraph.trim()) return null;

                  // Handle bullet points
                  if (paragraph.includes('•') || paragraph.includes('*')) {
                    const bulletPoints = paragraph.split('\n').filter(line => line.trim());
                    return (
                      <div key={paragraphIndex} className="space-y-3">
                        {bulletPoints.map((line, lineIndex) => {
                          if (line.trim().startsWith('•') || line.trim().startsWith('*')) {
                            return (
                              <div key={lineIndex} className="flex items-start">
                                <div className="w-2 h-2 bg-black rounded-full mt-2.5 mr-4 flex-shrink-0"></div>
                                <span className="text-black leading-relaxed">
                                  {line.replace(/^[•*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                                </span>
                              </div>
                            );
                          }
                          return line.trim() ? (
                            <p key={lineIndex} className="text-black font-semibold text-lg mb-2">
                              {line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                            </p>
                          ) : null;
                        })}
                      </div>
                    );
                  }

                  // Regular paragraphs
                  return (
                    <p key={paragraphIndex} className="text-black leading-relaxed text-base">
                      {paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div key={index} className="mb-8">
          <div className="text-gray-800 leading-relaxed space-y-4">
            {section.split('\n\n').map((paragraph, paragraphIndex) =>
              paragraph.trim() ? (
                <p key={paragraphIndex} className="text-gray-800 text-base leading-relaxed">
                  {paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                </p>
              ) : null
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            AI Market Analysis {coinName && `for ${coinName}`}
          </h2>
          <div className="flex items-center space-x-4">
            {recommendation && (
              <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getRecommendationColor(recommendation)}`}>
                {recommendation.toUpperCase()}
              </div>
            )}

          </div>
        </div>

        {confidence && (
          <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">Analysis Confidence</span>
              <span className="text-lg font-bold text-gray-900">{confidence.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-black h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(confidence, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="px-8 py-8">
        <div className="max-w-none">
          {analysis.includes('##') ? (
            <div className="space-y-2">{formatAnalysisText(analysis)}</div>
          ) : (
            <div className="text-black leading-relaxed space-y-6">
              {analysis
                .replace(/\\n/g, '\n') // Handle escaped newlines
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert to HTML bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>') // Convert to HTML italic
                .split('\n\n')
                .map((paragraph, index) =>
                  paragraph.trim() ? (
                    <p key={index} className="text-black text-base leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: paragraph }}>
                    </p>
                  ) : null
                )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with timestamp or additional info */}
      <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
        <div className="flex items-start justify-between text-sm text-gray-600">
          <span>Generated by AI • For Educational purposes only</span>
          <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default AiAnalysisCard;