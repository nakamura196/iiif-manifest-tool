'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';

export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarMessage {
  id: string;
  message: string;
  severity: SnackbarSeverity;
}

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: SnackbarSeverity) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: React.ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<SnackbarMessage[]>([]);

  const showSnackbar = useCallback((message: string, severity: SnackbarSeverity = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    const newMessage: SnackbarMessage = { id, message, severity };
    
    setMessages(prev => [...prev, newMessage]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id));
    }, 5000);
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const getIcon = (severity: SnackbarSeverity) => {
    switch (severity) {
      case 'success':
        return <FiCheckCircle className="text-green-500" />;
      case 'error':
        return <FiXCircle className="text-red-500" />;
      case 'warning':
        return <FiAlertCircle className="text-yellow-500" />;
      case 'info':
      default:
        return <FiInfo className="text-blue-500" />;
    }
  };

  const getBgColor = (severity: SnackbarSeverity) => {
    switch (severity) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {messages.map(({ id, message, severity }) => (
          <div
            key={id}
            className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg max-w-sm pointer-events-auto transform transition-all duration-300 ${getBgColor(severity)}`}
          >
            {getIcon(severity)}
            <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{message}</span>
            <button
              onClick={() => removeMessage(id)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
};