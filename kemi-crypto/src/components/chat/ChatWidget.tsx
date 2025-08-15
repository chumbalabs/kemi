import React, { useState, useEffect, useRef } from 'react';
import chatService, { type ChatMessage, type ChatResponse } from '../../services/chatService';

interface ChatWidgetProps {
    coinContext?: string; // Current coin being viewed
    className?: string;
}

interface Message extends ChatMessage {
    id: string;
    isLoading?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ coinContext, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load suggestions when widget opens
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            loadSuggestions();
        }
    }, [isOpen]);

    // Update suggestions when coin context changes
    useEffect(() => {
        if (isOpen) {
            loadSuggestions();
        }
    }, [coinContext]);

    // Removed conversation history loading for stateless operation

    const loadSuggestions = async () => {
        try {
            const suggestionsData = await chatService.getSuggestions(coinContext);
            setSuggestions(suggestionsData.suggestions);
        } catch (error) {
            console.error('Error loading suggestions:', error);
        }
    };

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: messageText.trim(),
            timestamp: new Date().toISOString(),
            coin_context: coinContext
        };

        // Add user message immediately
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        setError(null);
        setIsTyping(true);

        try {
            const response: ChatResponse = await chatService.sendMessage({
                message: messageText.trim(),
                conversation_history: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    coin_context: msg.coin_context
                })),
                coin_context: coinContext,
                include_market_data: true
            });

            // Add AI response
            const aiMessage: Message = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: response.message,
                timestamp: response.timestamp,
                coin_context: coinContext
            };

            setMessages(prev => [...prev, aiMessage]);
            setSuggestions(response.suggestions);

        } catch (error) {
            console.error('Error sending message:', error);
            setError(error instanceof Error ? error.message : 'Failed to send message');

            // Add error message
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputMessage);
        }
    };

    const clearConversation = async () => {
        // Simple local state reset - no server calls needed
        setMessages([]);
        setError(null);
        loadSuggestions();
    };

    const formatMessage = (content: string) => {
        // Simple markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
            .replace(/\n/g, '<br>');
    };

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) {
        return (
            <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-black hover:bg-gray-800 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
                    aria-label="Open chat"
                >
                    <MessageCircleIcon className="w-6 h-6" />
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 h-[600px] flex flex-col">
                {/* Header */}
                <div className="bg-black text-white p-4 rounded-t-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <SparklesIcon className="w-5 h-5" />
                        <div>
                            <h3 className="font-semibold">Kemi AI</h3>
                            <p className="text-xs opacity-90">
                                {coinContext ? `Analyzing ${coinContext.toUpperCase()}` : 'Crypto Analysis Assistant'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={clearConversation}
                            className="text-gray-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                            title="Clear conversation"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-300 hover:text-white transition-colors"
                            aria-label="Close chat"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && !isLoading && (
                        <div className="text-center text-gray-500 py-8">
                            <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-sm">
                                Hi! I'm Kemi, your crypto analysis assistant.
                                {coinContext ? ` Ask me anything about ${coinContext}!` : ' How can I help you today?'}
                            </p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 ${message.role === 'user'
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-900'
                                    }`}
                            >
                                <div
                                    className="text-sm text-left"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                                />
                                {message.timestamp && (
                                    <div className={`text-xs mt-1 text-left ${message.role === 'user' ? 'text-gray-300' : 'text-gray-500'
                                        }`}>
                                        {formatTimestamp(message.timestamp)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center space-x-2">
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                                <span className="text-sm text-gray-600">Kemi is thinking...</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-600 text-sm">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="text-red-500 text-xs mt-1 hover:underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100">
                        <div className="flex flex-wrap gap-2">
                            {suggestions.slice(0, 3).map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="text-xs bg-gray-100 hover:bg-black hover:text-white text-gray-700 px-2 py-1 rounded-full transition-colors border border-gray-200 hover:border-black"
                                    disabled={isLoading}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex space-x-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={coinContext ? `Ask about ${coinContext}...` : "Ask me about crypto..."}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => sendMessage(inputMessage)}
                            disabled={!inputMessage.trim() || isLoading}
                            className="bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg px-3 py-2 transition-colors"
                            aria-label="Send message"
                        >
                            {isLoading ? (
                                <LoaderIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <SendIcon className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple icon components (you can replace with your preferred icon library)
const MessageCircleIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const XIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 21a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM19 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM19 21a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
    </svg>
);

export default ChatWidget;