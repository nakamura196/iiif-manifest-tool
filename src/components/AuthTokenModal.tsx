'use client';

import { useState } from 'react';
import { FiKey, FiCopy, FiCheck } from 'react-icons/fi';

interface AuthTokenModalProps {
  itemId: string;
  itemTitle: string;
  onClose: () => void;
}

export default function AuthTokenModal({ itemId, itemTitle, onClose }: AuthTokenModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/iiif/auth/token/${itemId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setToken(data.accessToken);
      } else {
        const errorData = await response.json();
        console.error('Failed to generate token:', response.status, errorData);
        alert(`トークン生成エラー: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating token:', error);
      alert('トークン生成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyAuthHeader = () => {
    if (token) {
      navigator.clipboard.writeText(`Authorization: Bearer ${token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <FiKey className="text-2xl text-blue-500" />
          <h2 className="text-xl font-bold">認証トークン生成</h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          「{itemTitle}」の認証トークンを生成します。このトークンを使用して、外部のIIIFビューアから非公開コンテンツにアクセスできます。
        </p>

        {!token ? (
          <div className="text-center py-8">
            <button
              onClick={generateToken}
              disabled={loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? '生成中...' : 'トークンを生成'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">アクセストークン</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-sm"
                />
                <button
                  onClick={copyToken}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">HTTPヘッダー形式</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`Authorization: Bearer ${token}`}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-sm"
                />
                <button
                  onClick={copyAuthHeader}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>注意:</strong> このトークンは1時間で有効期限が切れます。
                IIIFビューアでAuthorizationヘッダーとして使用してください。
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="font-medium mb-2">使用方法</h3>
              <ol className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                <li>1. IIIFビューアでマニフェストURLを開く</li>
                <li>2. 認証が必要な場合、上記のトークンを使用</li>
                <li>3. HTTPリクエストのAuthorizationヘッダーに設定</li>
              </ol>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}