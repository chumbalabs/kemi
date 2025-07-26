import type { FC } from 'react';


interface AiAnalysisProps {
  analysisText: string;
  isLoading: boolean;
}

const AiAnalysis: FC<AiAnalysisProps> = ({ analysisText, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-center mb-3">
          <h2 className="text-xl font-semibold text-emerald-400">AI Market Analysis</h2>
          <div className="ml-2 px-2 py-0.5 bg-purple-600 rounded text-xs">GPT-4o</div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex items-center mb-3">
        <h2 className="text-xl font-semibold text-emerald-400">AI Market Analysis</h2>
        <div className="ml-2 px-2 py-0.5 bg-purple-600 rounded text-xs">GPT-4o</div>
      </div>
      {analysisText ? (
        <div className="text-white">
          {analysisText.split('\n').map((line, index) => (
            <p key={index} className={index !== 0 ? 'mt-2' : ''}>
              {line}
            </p>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400">
          No analysis available
        </div>
      )}
    </div>
  );
};

export default AiAnalysis; 