'use client';

import React from 'react';
import { FiAlertTriangle, FiLoader } from 'react-icons/fi';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  progress?: {
    current: number;
    total: number;
  };
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '削除',
  cancelText = 'キャンセル',
  variant = 'danger',
  isLoading = false,
  progress
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-600 dark:text-red-400',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          icon: 'text-yellow-600 dark:text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      case 'info':
      default:
        return {
          icon: 'text-blue-600 dark:text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${styles.icon}`}>
              <FiAlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {isLoading ? '削除処理を実行しています...' : message}
              </p>
              {isLoading && !progress && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FiLoader className="animate-spin" />
                  <span>処理中です。しばらくお待ちください...</span>
                </div>
              )}
              {isLoading && progress && (
                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      削除中... ({progress.current}/{progress.total})
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round((progress.current / progress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              if (!isLoading) {
                onConfirm();
              }
            }}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${styles.button} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading && <FiLoader className="animate-spin" />}
            {isLoading ? '削除中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};