'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiFolder, 
  FiFile, 
  FiDownload, 
  FiEye, 
  FiTrash2, 
  FiChevronRight, 
  FiHome,
  FiRefreshCw,
  FiX,
  FiImage,
  FiFileText,
  FiArchive,
  FiLoader
} from 'react-icons/fi';

interface S3Object {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  contentType?: string;
}

interface BrowseResult {
  path: string;
  directories: S3Object[];
  files: S3Object[];
  parentPath?: string;
  totalSize: number;
  totalCount: number;
}

interface PreviewData {
  type: 'text' | 'json' | 'image';
  contentType: string;
  data: string;
  size?: number;
}

export default function S3BrowserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [browseResult, setBrowseResult] = useState<BrowseResult | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    } else {
      // Load initial directory
      loadDirectory('');
    }
  }, [status, router]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/s3-browser?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('アクセスが拒否されました。管理者権限が必要です。');
        } else {
          throw new Error('Failed to load directory');
        }
        return;
      }
      
      const data = await response.json();
      setBrowseResult(data);
      setCurrentPath(path);
    } catch (err) {
      setError('ディレクトリの読み込みに失敗しました');
      console.error('Error loading directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleDownload = async (file: S3Object) => {
    try {
      const response = await fetch(`/api/admin/s3-browser?action=download&key=${encodeURIComponent(file.key)}`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('ファイルのダウンロードに失敗しました');
      console.error('Error downloading file:', err);
    }
  };

  const handlePreview = async (file: S3Object) => {
    setSelectedFile(file);
    setShowPreview(true);
    setPreviewData(null);
    
    try {
      const response = await fetch(`/api/admin/s3-browser?action=preview&key=${encodeURIComponent(file.key)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to preview file');
      }
      
      const data = await response.json();
      setPreviewData(data);
    } catch (err) {
      setPreviewData({
        type: 'text',
        contentType: 'text/plain',
        data: `プレビューできません: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  const handleDelete = async (file: S3Object) => {
    if (!confirm(`本当に "${file.name}" を削除しますか？`)) {
      return;
    }
    
    setDeleting(file.key);
    try {
      const response = await fetch('/api/admin/s3-browser', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: file.key }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      // Reload current directory
      loadDirectory(currentPath);
    } catch (err) {
      setError('ファイルの削除に失敗しました');
      console.error('Error deleting file:', err);
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: S3Object) => {
    if (file.isDirectory) return <FiFolder className="text-blue-500" />;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <FiImage className="text-green-500" />;
    }
    if (['json', 'txt', 'csv', 'xml', 'html', 'css', 'js', 'ts', 'tsx'].includes(ext || '')) {
      return <FiFileText className="text-purple-500" />;
    }
    if (['zip', 'tar', 'gz'].includes(ext || '')) {
      return <FiArchive className="text-orange-500" />;
    }
    return <FiFile className="text-gray-500" />;
  };

  const renderBreadcrumb = () => {
    const parts = currentPath.split('/').filter(p => p);
    return (
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => handleNavigate('')}
          className="hover:text-blue-500 transition-colors"
        >
          <FiHome />
        </button>
        {parts.map((part, index) => {
          const path = parts.slice(0, index + 1).join('/');
          return (
            <div key={index} className="flex items-center gap-2">
              <FiChevronRight className="text-gray-400" />
              <button
                onClick={() => handleNavigate(path)}
                className="hover:text-blue-500 transition-colors"
              >
                {part}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FiFolder className="text-blue-500" />
                S3 ブラウザ
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                オブジェクトストレージの内容を参照
              </p>
            </div>
            <button
              onClick={() => loadDirectory(currentPath)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              更新
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {renderBreadcrumb()}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <FiX />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* File Browser */}
        {browseResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* Stats */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{browseResult.totalCount} アイテム</span>
                <span>合計: {formatFileSize(browseResult.totalSize)}</span>
              </div>
            </div>

            {/* File List */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      名前
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      サイズ
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      最終更新
                    </th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Parent directory */}
                  {browseResult.parentPath !== undefined && (
                    <tr
                      className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                      onClick={() => handleNavigate(browseResult.parentPath!)}
                    >
                      <td className="px-6 py-4 flex items-center gap-3">
                        <FiFolder className="text-blue-500" />
                        <span className="font-mono">..</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">-</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">-</td>
                      <td className="px-6 py-4 text-center">-</td>
                    </tr>
                  )}

                  {/* Directories */}
                  {browseResult.directories.map((dir) => (
                    <tr
                      key={dir.key}
                      className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                      onClick={() => handleNavigate(dir.key)}
                    >
                      <td className="px-6 py-4 flex items-center gap-3">
                        {getFileIcon(dir)}
                        <span className="font-mono">{dir.name}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">-</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">-</td>
                      <td className="px-6 py-4 text-center">-</td>
                    </tr>
                  ))}

                  {/* Files */}
                  {browseResult.files.map((file) => (
                    <tr
                      key={file.key}
                      className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <td className="px-6 py-4 flex items-center gap-3">
                        {getFileIcon(file)}
                        <span className="font-mono text-sm">{file.name}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {new Date(file.lastModified).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handlePreview(file)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="プレビュー"
                          >
                            <FiEye className="text-blue-500" />
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="ダウンロード"
                          >
                            <FiDownload className="text-green-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(file)}
                            disabled={deleting === file.key}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                            title="削除"
                          >
                            {deleting === file.key ? (
                              <FiLoader className="animate-spin text-gray-500" />
                            ) : (
                              <FiTrash2 className="text-red-500" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {browseResult.directories.length === 0 && browseResult.files.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  このディレクトリは空です
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {getFileIcon(selectedFile)}
                  {selectedFile.name}
                </h2>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedFile(null);
                    setPreviewData(null);
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FiX />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {!previewData ? (
                  <div className="flex items-center justify-center py-8">
                    <FiLoader className="animate-spin text-2xl text-gray-500" />
                  </div>
                ) : previewData.type === 'image' ? (
                  <img 
                    src={previewData.data} 
                    alt={selectedFile.name}
                    className="max-w-full mx-auto"
                  />
                ) : previewData.type === 'json' ? (
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(JSON.parse(previewData.data), null, 2)}
                  </pre>
                ) : (
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
                    {previewData.data}
                  </pre>
                )}
              </div>

              {previewData && (
                <div className="p-4 border-t dark:border-gray-700 text-sm text-gray-500">
                  タイプ: {previewData.contentType} | 
                  サイズ: {previewData.size ? formatFileSize(previewData.size) : 'N/A'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}