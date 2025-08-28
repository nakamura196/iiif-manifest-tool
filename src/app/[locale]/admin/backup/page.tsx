'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiDownload, FiHardDrive, FiFile, FiAlertCircle, FiRefreshCw, FiLoader, FiCheck, FiX, FiUsers, FiFileText } from 'react-icons/fi';

interface FileInfo {
  key: string;
  size: number;
  lastModified: Date;
}

interface BackupInfo {
  files: FileInfo[];
  totalCount: number;
  totalSize: number;
  totalSizeMB: string;
}

export default function AdminBackupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filterPattern, setFilterPattern] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  const fetchBackupInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/backup?action=list');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('アクセスが拒否されました。管理者権限が必要です。');
        } else {
          throw new Error('Failed to fetch backup information');
        }
        return;
      }
      
      const data = await response.json();
      setBackupInfo(data);
    } catch (err) {
      setError('バックアップ情報の取得に失敗しました');
      console.error('Error fetching backup info:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async () => {
    setDownloading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/backup');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('アクセスが拒否されました。管理者権限が必要です。');
        } else {
          throw new Error('Failed to download backup');
        }
        return;
      }
      
      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `iiif-backup-${new Date().toISOString().split('T')[0]}.zip`;
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success message
      setError(''); // Clear any errors
    } catch (err) {
      setError('バックアップのダウンロードに失敗しました');
      console.error('Error downloading backup:', err);
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = backupInfo?.files.filter(file => 
    !filterPattern || file.key.toLowerCase().includes(filterPattern.toLowerCase())
  ) || [];

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FiHardDrive className="text-blue-500" />
                システムバックアップ管理
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                オブジェクトストレージの全データをバックアップ
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">ログインユーザー</p>
              <p className="font-medium">{session?.user?.email}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-yellow-600 dark:text-yellow-400 text-xl mt-1" />
              <div>
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  管理者専用機能
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  この機能は特権管理者のみが使用できます。大容量のダウンロードが発生する可能性があります。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">バックアップ情報</h2>
            <button
              onClick={fetchBackupInfo}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              情報を取得
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <FiX />
                <span>{error}</span>
              </div>
            </div>
          )}

          {backupInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FiFile className="text-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">総ファイル数</span>
                </div>
                <p className="text-2xl font-bold">{backupInfo.totalCount.toLocaleString()}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FiHardDrive className="text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">総容量</span>
                </div>
                <p className="text-2xl font-bold">{backupInfo.totalSizeMB} MB</p>
                <p className="text-sm text-gray-500">({formatFileSize(backupInfo.totalSize)})</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FiDownload className="text-purple-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">推定ダウンロード時間</span>
                </div>
                <p className="text-2xl font-bold">
                  {Math.ceil(backupInfo.totalSize / (1024 * 1024 * 10))} 分
                </p>
                <p className="text-sm text-gray-500">(10 MB/秒で計算)</p>
              </div>
            </div>
          )}
        </div>

        {/* File Preview */}
        {backupInfo && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">ファイル一覧</h2>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-blue-500 hover:text-blue-600"
              >
                {showPreview ? '非表示' : '表示'} ({filteredFiles.length} ファイル)
              </button>
            </div>

            {showPreview && (
              <>
                <input
                  type="text"
                  value={filterPattern}
                  onChange={(e) => setFilterPattern(e.target.value)}
                  placeholder="ファイル名でフィルター..."
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 mb-4"
                />

                <div className="max-h-96 overflow-y-auto border dark:border-gray-700 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2">ファイル名</th>
                        <th className="text-right px-4 py-2">サイズ</th>
                        <th className="text-right px-4 py-2">最終更新</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.slice(0, 100).map((file, index) => (
                        <tr key={index} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900">
                          <td className="px-4 py-2 font-mono text-sm">{file.key}</td>
                          <td className="text-right px-4 py-2 text-sm">{formatFileSize(file.size)}</td>
                          <td className="text-right px-4 py-2 text-sm">
                            {new Date(file.lastModified).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredFiles.length > 100 && (
                    <div className="text-center py-4 text-gray-500">
                      他 {filteredFiles.length - 100} ファイル...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* User Data Export */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FiUsers className="text-purple-500" />
            ユーザーデータエクスポート
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                window.location.href = '/api/admin/users/export?format=json';
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <FiFileText />
              JSON形式
            </button>
            <button
              onClick={() => {
                window.location.href = '/api/admin/users/export?format=csv';
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <FiFileText />
              CSV形式
            </button>
            <button
              onClick={() => {
                window.location.href = '/api/admin/users/export?format=txt';
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FiFileText />
              テキスト形式
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ユーザーID、メールアドレス、名前、コレクション数、アイテム数、総容量、最終活動日時をエクスポートします。
            </p>
          </div>
        </div>

        {/* Download Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">バックアップ実行</h2>
          
          <div className="space-y-4">
            <button
              onClick={downloadBackup}
              disabled={downloading || !backupInfo}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium text-lg"
            >
              {downloading ? (
                <>
                  <FiLoader className="animate-spin text-xl" />
                  ダウンロード中...
                </>
              ) : (
                <>
                  <FiDownload className="text-xl" />
                  全ファイルをZIPでダウンロード
                </>
              )}
            </button>

            {!backupInfo && (
              <p className="text-center text-gray-500 text-sm">
                まず「情報を取得」ボタンをクリックしてバックアップ情報を確認してください
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">注意事項</h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>大容量のデータをダウンロードする場合、処理に時間がかかることがあります</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>ダウンロード中はブラウザを閉じないでください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>十分なディスク容量があることを確認してください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>定期的なバックアップの実施を推奨します</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}