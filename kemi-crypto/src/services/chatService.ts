/**
 * Chat Service for AI-powered cryptocurrency analysis
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  coin_context?: string;
}

export interface ChatRequest {
  message: string;
  conversation_history: ChatMessage[];
  coin_context?: string;
  include_market_data?: boolean;
}

export interface ChatResponse {
  message: string;
  timestamp: string;
  suggestions: string[];
  coin_data?: {
    id: string;
    name: string;
    symbol: string;
    current_price: number;
    price_change_24h: number;
    market_cap_rank: number;
    market_cap: number;
  };
  charts_data?: any;
}

export interface ChatSuggestion {
  suggestions: string[];
}

class ChatService {
  // Stateless chat service - no persistent connections needed

  private getApiUrl(endpoint: string): string {
    // Debug logging
    console.log('🔧 Chat API URL debug:', {
      endpoint,
      API_BASE_URL,
      envValue: import.meta.env.VITE_API_BASE_URL,
      isProduction: API_BASE_URL && API_BASE_URL !== '/api'
    });
    
    if (API_BASE_URL && API_BASE_URL !== '/api') {
      const url = `${API_BASE_URL}/api/chat${endpoint}`;
      console.log('🔧 Using separate services URL:', url);
      return url;
    } else {
      const url = `/api/chat${endpoint}`;
      console.log('🔧 Using relative URL:', url);
      return url;
    }
  }

  /**
   * Send a message to the AI chat agent (Fast, stateless)
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const url = this.getApiUrl('/message');
      console.log('🚀 Sending fast chat message to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Chat API error:', response.status, response.statusText, errorText);
        
        if (response.status === 429) {
          throw new Error('Too many messages. Please wait a moment.');
        }
        if (response.status === 404) {
          throw new Error('Chat service not available. Please check if the backend is running.');
        }
        if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        throw new Error(`Chat service error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Fast chat response received');
      return data;
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to chat service.');
      }
      
      throw error;
    }
  }

  // Removed session-based methods for better performance

  /**
   * Get contextual chat suggestions
   */
  async getSuggestions(coinContext?: string): Promise<ChatSuggestion> {
    try {
      const url = new URL(this.getApiUrl('/suggestions'));
      if (coinContext) {
        url.searchParams.set('coin_context', coinContext);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting suggestions:', error);
      // Return default suggestions on error
      return {
        suggestions: [
          "What's happening in crypto today?",
          "Explain technical analysis basics",
          "What should beginners know about crypto?",
        ]
      };
    }
  }

  // WebSocket functionality removed for stateless operation

  /**
   * Get chat system statistics
   */
  async getStats(): Promise<any> {
    try {
      const response = await fetch(this.getApiUrl('/stats'));
      
      if (!response.ok) {
        throw new Error(`Failed to get chat stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting chat stats:', error);
      return null;
    }
  }

  // Removed session management for stateless operation

  /**
   * Test chat service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl('/test'));
      return response.ok;
    } catch (error) {
      console.error('Chat service connection test failed:', error);
      return false;
    }
  }
}

export default new ChatService();