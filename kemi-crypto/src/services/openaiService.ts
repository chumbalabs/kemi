import axios from 'axios';



// Create an axios instance for OpenAI API
const openaiApi = axios.create({
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
  }
});

class OpenAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  configureOpenAI(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
    
    // Update the axios instance with new configuration
    openaiApi.defaults.baseURL = this.baseUrl;
    openaiApi.defaults.headers['Authorization'] = `Bearer ${this.apiKey}`;
  }

  async generateAnalysis(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await openaiApi.post('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional cryptocurrency analyst. Provide detailed, accurate analysis based on the given data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI analysis');
    }
  }

  async generateMarketSummary(marketData: any): Promise<string> {
    const prompt = `Analyze the current cryptocurrency market based on this data: ${JSON.stringify(marketData)}. 
    Provide insights on market trends, key movements, and potential opportunities.`;

    return this.generateAnalysis(prompt);
  }
}

export default new OpenAIService();