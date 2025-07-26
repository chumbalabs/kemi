import { useState, useEffect } from 'react';

interface ApiStatusProps {
  show?: boolean;
  message?: string;
  type?: 'info' | 'warning' | 'error';
}

export default function ApiStatus({ show = false, message = '', type = 'info' }: ApiStatusProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    // Auto-hide after 5 seconds for non-error messages
    if (show && type !== 'error') {
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [show, type]);

  if (!isVisible) return null;

  const getStatusStyles = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`fixed top-20 right-4 z-50 max-w-sm p-3 border rounded-lg shadow-lg ${getStatusStyles()}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{getIcon()}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          <button
            onClick={() => setIsVisible(false)}
            className="mt-1 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
} 