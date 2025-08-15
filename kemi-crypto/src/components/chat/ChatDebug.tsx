import React, { useState, useEffect } from 'react';
import chatService from '../../services/chatService';

const ChatDebug: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    // Test connection
    testConnection();
  }, []);

  const testConnection = async () => {
    setTestResult('Testing...');
    try {
      const connected = await chatService.testConnection();
      setIsConnected(connected);
      setTestResult(connected ? 'Connection successful!' : 'Connection failed');
    } catch (error) {
      setIsConnected(false);
      setTestResult(`Connection error: ${error}`);
    }
  };

  const testMessage = async () => {
    setTestResult('Sending test message...');
    try {
      const response = await chatService.sendMessage({
        message: 'Hello, this is a test message',
        conversation_history: [],
        include_market_data: false
      });
      setTestResult(`Test message successful! Response: ${response.message.substring(0, 100)}...`);
    } catch (error) {
      setTestResult(`Test message failed: ${error}`);
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-lg mb-3">Chat Service Debug</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Mode:</strong> Stateless (No Sessions)
        </div>
        
        <div>
          <strong>Connection Status:</strong>{' '}
          <span className={isConnected === null ? 'text-gray-500' : isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected === null ? 'Testing...' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div>
          <strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'Not set (using relative URLs)'}
        </div>
        
        <div>
          <strong>Test Result:</strong> {testResult}
        </div>
      </div>
      
      <div className="flex space-x-2 mt-4">
        <button
          onClick={testConnection}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Test Connection
        </button>
        
        <button
          onClick={testMessage}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          Test Message
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

export default ChatDebug;