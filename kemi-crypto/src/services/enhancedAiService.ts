/**
 * Enhanced AI Analysis Service
 * Combines MCP real-time data with AI analysis for comprehensive market insights
 */

import mcpCoingeckoService from './mcpCoingeckoService';
import openaiService from './openaiService';
import { generateGeminiAnalysis } from './geminiService';

interface MarketAnalysisData {
  globalData: any;
  trendingCoins: any[];
  topGainers: any[];
  topLosers: any[];
  topCoins: any[];
}

interface AnalysisResult {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyInsights: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

class EnhancedAiService {
  private openAiApiKey: string;
  private geminiApiKey: string;
  private preferredProvider: 'openai' | 'gemini';

  constructor(
    openAiApiKey = '',
    geminiApiKey = '',
    preferredProvider: 'openai' | 'gemini' = 'gemini'
  ) {
    this.openAiApiKey = openAiApiKey;
    this.geminiApiKey = geminiApiKey;
    this.preferredProvider = preferredProvider;
  }

  /**
   * Generate comprehensive market analysis using MCP data
   */
  async generateMarketAnalysis(): Promise<AnalysisResult> {
    try {
      // Fetch real-time data using MCP
      const marketData = await this.fetchMarketData();
      
      // Generate analysis prompt
      const prompt = this.createAnalysisPrompt(marketData);
      
      // Get AI analysis
      const analysis = await this.getAiAnalysis(prompt);
      
      // Parse and structure the response
      return this.parseAnalysisResponse(analysis);
      
    } catch (error) {
      console.error('❌ Enhanced AI analysis failed:', error);
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Generate analysis for a specific coin
   */
  async generateCoinAnalysis(coinId: string): Promise<AnalysisResult> {
    try {
      // Fetch coin-specific data
      const coinData = await mcpCoingeckoService.getCoinsMarkets({
        ids: coinId,
        vs_currency: 'usd',
        price_change_percentage: '1h,24h,7d,30d'
      });

      if (!coinData || coinData.length === 0) {
        throw new Error('No coin data available');
      }

      const coin = coinData[0];
      
      // Get market context
      const globalData = await mcpCoingeckoService.getGlobalData();
      const gainersLosers = await mcpCoingeckoService.getTopGainersLosers();
      
      const prompt = this.createCoinAnalysisPrompt(coin, globalData, gainersLosers);
      const analysis = await this.getAiAnalysis(prompt);
      
      return this.parseAnalysisResponse(analysis);
      
    } catch (error) {
      console.error(`❌ Coin analysis failed for ${coinId}:`, error);
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Fetch comprehensive market data using MCP
   */
  private async fetchMarketData(): Promise<MarketAnalysisData> {
    const [globalData, trendingResult, gainersLosers, topCoins] = await Promise.allSettled([
      mcpCoingeckoService.getGlobalData(),
      mcpCoingeckoService.getTrendingCoins(),
      mcpCoingeckoService.getTopGainersLosers(),
      mcpCoingeckoService.getCoinsMarkets({
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 10,
        page: 1,
        price_change_percentage: '1h,24h,7d'
      })
    ]);

    return {
      globalData: globalData.status === 'fulfilled' ? globalData.value : null,
      trendingCoins: trendingResult.status === 'fulfilled' ? 
        trendingResult.value?.coins?.slice(0, 5) || [] : [],
      topGainers: gainersLosers.status === 'fulfilled' ? 
        gainersLosers.value?.top_gainers?.slice(0, 5) || [] : [],
      topLosers: gainersLosers.status === 'fulfilled' ? 
        gainersLosers.value?.top_losers?.slice(0, 5) || [] : [],
      topCoins: topCoins.status === 'fulfilled' ? topCoins.value || [] : []
    };
  }

  /**
   * Create comprehensive analysis prompt
   */
  private createAnalysisPrompt(data: MarketAnalysisData): string {
    const { globalData, trendingCoins, topGainers, topLosers, topCoins } = data;
    
    return `
As a cryptocurrency market analyst, provide a comprehensive analysis based on the following real-time data:

GLOBAL MARKET DATA:
${globalData ? `
- Total Market Cap: $${(globalData.data.total_market_cap?.usd / 1e12).toFixed(2)}T
- 24h Change: ${globalData.data.market_cap_change_percentage_24h_usd?.toFixed(2)}%
- Total Volume: $${(globalData.data.total_volume?.usd / 1e9).toFixed(2)}B
- Active Cryptocurrencies: ${globalData.data.active_cryptocurrencies}
- Bitcoin Dominance: ${globalData.data.market_cap_percentage?.btc?.toFixed(1)}%
- Ethereum Dominance: ${globalData.data.market_cap_percentage?.eth?.toFixed(1)}%
` : 'Global data unavailable'}

TOP TRENDING COINS:
${trendingCoins.map((coin, i) => 
  `${i + 1}. ${coin.item?.name} (${coin.item?.symbol}) - Rank #${coin.item?.market_cap_rank}`
).join('\n')}

TOP GAINERS (24h):
${topGainers.map((coin, i) => 
  `${i + 1}. ${coin.name} (${coin.symbol}): +${coin.usd_24h_change?.toFixed(2)}% - $${coin.usd}`
).join('\n')}

TOP LOSERS (24h):
${topLosers.map((coin, i) => 
  `${i + 1}. ${coin.name} (${coin.symbol}): ${coin.usd_24h_change?.toFixed(2)}% - $${coin.usd}`
).join('\n')}

TOP COINS BY MARKET CAP:
${topCoins.map((coin, i) => 
  `${i + 1}. ${coin.name} (${coin.symbol}): $${coin.current_price} (${coin.price_change_percentage_24h?.toFixed(2)}%)`
).join('\n')}

Please provide:
1. A concise market summary (2-3 sentences)
2. Current market sentiment (bullish/bearish/neutral)
3. 3-4 key insights about market conditions
4. 2-3 actionable recommendations for investors
5. Risk assessment (low/medium/high)
6. Confidence level in your analysis (1-100%)

Format your response as JSON with the following structure:
{
  "summary": "Market summary here",
  "sentiment": "bullish|bearish|neutral",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "riskLevel": "low|medium|high",
  "confidence": 85
}
`;
  }

  /**
   * Create coin-specific analysis prompt
   */
  private createCoinAnalysisPrompt(coin: any, globalData: any, gainersLosers: any): string {
    return `
As a cryptocurrency analyst, analyze ${coin.name} (${coin.symbol}) based on this data:

COIN DATA:
- Current Price: $${coin.current_price}
- Market Cap Rank: #${coin.market_cap_rank}
- Market Cap: $${(coin.market_cap / 1e9).toFixed(2)}B
- 24h Volume: $${(coin.total_volume / 1e6).toFixed(2)}M
- Price Changes:
  * 1h: ${coin.price_change_percentage_1h_in_currency?.toFixed(2)}%
  * 24h: ${coin.price_change_percentage_24h?.toFixed(2)}%
  * 7d: ${coin.price_change_percentage_7d_in_currency?.toFixed(2)}%

MARKET CONTEXT:
- Overall market 24h change: ${globalData?.data?.market_cap_change_percentage_24h_usd?.toFixed(2)}%
- Bitcoin dominance: ${globalData?.data?.market_cap_percentage?.btc?.toFixed(1)}%
- Is in top gainers: ${gainersLosers?.top_gainers?.some((g: any) => g.id === coin.id) ? 'Yes' : 'No'}
- Is in top losers: ${gainersLosers?.top_losers?.some((l: any) => l.id === coin.id) ? 'Yes' : 'No'}

Provide analysis in JSON format:
{
  "summary": "Brief analysis of the coin's current state",
  "sentiment": "bullish|bearish|neutral",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2"],
  "riskLevel": "low|medium|high",
  "confidence": 85
}
`;
  }

  /**
   * Get AI analysis using preferred provider
   */
  private async getAiAnalysis(prompt: string): Promise<string> {
    if (this.preferredProvider === 'openai' && this.openAiApiKey) {
      try {
        return await openaiService.generateAnalysis(prompt);
      } catch (error) {
        console.warn('OpenAI failed, falling back to Gemini');
      }
    }
    
    if (this.geminiApiKey) {
      return await generateGeminiAnalysis(prompt, this.geminiApiKey);
    }
    
    throw new Error('No AI provider available');
  }

  /**
   * Parse AI response into structured format
   */
  private parseAnalysisResponse(response: string): AnalysisResult {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || 'Analysis unavailable',
        sentiment: parsed.sentiment || 'neutral',
        keyInsights: parsed.keyInsights || [],
        recommendations: parsed.recommendations || [],
        riskLevel: parsed.riskLevel || 'medium',
        confidence: parsed.confidence || 50
      };
    } catch (error) {
      // Fallback to text parsing
      return {
        summary: response.substring(0, 200) + '...',
        sentiment: this.extractSentiment(response),
        keyInsights: this.extractInsights(response),
        recommendations: this.extractRecommendations(response),
        riskLevel: this.extractRiskLevel(response),
        confidence: 60
      };
    }
  }

  /**
   * Extract sentiment from text response
   */
  private extractSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('bullish') || lowerText.includes('positive') || lowerText.includes('upward')) {
      return 'bullish';
    }
    if (lowerText.includes('bearish') || lowerText.includes('negative') || lowerText.includes('downward')) {
      return 'bearish';
    }
    return 'neutral';
  }

  /**
   * Extract key insights from text
   */
  private extractInsights(text: string): string[] {
    const insights = [];
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (sentence.length > 20 && sentence.length < 150) {
        insights.push(sentence.trim());
        if (insights.length >= 3) break;
      }
    }
    
    return insights.length > 0 ? insights : ['Market analysis indicates mixed signals'];
  }

  /**
   * Extract recommendations from text
   */
  private extractRecommendations(text: string): string[] {
    const recommendations = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('buy') || lowerText.includes('accumulate')) {
      recommendations.push('Consider accumulating on dips');
    }
    if (lowerText.includes('sell') || lowerText.includes('take profit')) {
      recommendations.push('Consider taking profits');
    }
    if (lowerText.includes('hold') || lowerText.includes('wait')) {
      recommendations.push('Hold current positions');
    }
    
    return recommendations.length > 0 ? recommendations : ['Monitor market conditions closely'];
  }

  /**
   * Extract risk level from text
   */
  private extractRiskLevel(text: string): 'low' | 'medium' | 'high' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('high risk') || lowerText.includes('volatile')) {
      return 'high';
    }
    if (lowerText.includes('low risk') || lowerText.includes('stable')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Provide fallback analysis when AI fails
   */
  private getFallbackAnalysis(): AnalysisResult {
    return {
      summary: 'Market analysis is currently unavailable. Please check your API configuration.',
      sentiment: 'neutral',
      keyInsights: ['Real-time data analysis unavailable'],
      recommendations: ['Monitor market conditions manually'],
      riskLevel: 'medium',
      confidence: 0
    };
  }

  /**
   * Update API keys
   */
  updateApiKeys(openAiApiKey?: string, geminiApiKey?: string) {
    if (openAiApiKey) this.openAiApiKey = openAiApiKey;
    if (geminiApiKey) this.geminiApiKey = geminiApiKey;
  }

  /**
   * Set preferred AI provider
   */
  setPreferredProvider(provider: 'openai' | 'gemini') {
    this.preferredProvider = provider;
  }
}

export default EnhancedAiService;
export type { AnalysisResult, MarketAnalysisData };