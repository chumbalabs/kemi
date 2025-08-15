/**
 * Custom hook for managing chat functionality
 */

import { useState, useEffect, useCallback } from 'react';
import chatService, { type ChatMessage, type ChatResponse } from '../services/chatService';

interface UseChatOptions {
  coinContext?: string;
  autoLoadHistory?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  suggestions: string[];
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => Promise<void>;
  loadSuggestions: () => Promise<void>;
  isConnected: boolean;
}

export function useChat({ coinContext, autoLoadHistory = true }: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  // No conversation history loading needed for stateless chat

  // Load suggestions when coin context changes
  useEffect(() => {
    loadSuggestions();
  }, [coinContext]);

  // Removed conversation history loading for stateless operation

  const loadSuggestions = useCallback(async () => {
    try {
      const suggestionsData = await chatService.getSuggestions(coinContext);
      setSuggestions(suggestionsData.suggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Set default suggestions on error
      setSuggestions([
        "What's happening in crypto today?",
        "Explain technical analysis basics",
        "What should beginners know about crypto?",
      ]);
    }
  }, [coinContext]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
      coin_context: coinContext
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response: ChatResponse = await chatService.sendMessage({
        message: messageText.trim(),
        conversation_history: messages,
        coin_context: coinContext,
        include_market_data: true
      });

      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: response.timestamp,
        coin_context: coinContext
      };

      setMessages(prev => [...prev, aiMessage]);
      setSuggestions(response.suggestions);
      setIsConnected(true);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorChatMessage]);
      
      // Check if it's a connection error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        setIsConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, coinContext, isLoading]);

  const clearConversation = useCallback(async () => {
    // Simple local state reset - no server calls needed
    setMessages([]);
    setError(null);
    await loadSuggestions();
    console.log('✅ Conversation cleared locally');
  }, [loadSuggestions]);

  return {
    messages,
    isLoading,
    error,
    suggestions,
    sendMessage,
    clearConversation,
    loadSuggestions,
    isConnected
  };
}

export default useChat;