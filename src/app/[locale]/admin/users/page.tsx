'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiUsers,
  FiFolder,
  FiImage,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiRefreshCw,
  FiDownload,
  FiClock,
  FiGlobe,
  FiLock,
} from 'react-icons/fi';

interface CollectionInfo {
  id: string;
  name: string;
  isPublic: boolean;
  itemsCount: number;
  createdAt?: string;
}

interface UserInfo {
  userId: string;
  email?: string;
  name?: string;
  collectionsCount: number;
  itemsCount: number;
  totalSize: number;
  lastActivity?: string;
  collections?: CollectionInfo[];
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [loadingCollections, setLoadingCollections] = useState<Set<string>>(new Set());

  // Check if user is admin
  const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
  const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && !isAdmin)) {
      router.push('/');
    }
  }, [status, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCollections = async (userId: string) => {
    try {
      setLoadingCollections(prev => new Set(prev).add(userId));
      const response = await fetch(`/api/admin/users?includeCollections=true&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.data.length > 0) {
          const userData = data.data[0];
          setUsers(prev =>
            prev.map(user =>
              user.userId === userId ? { ...user, collections: userData.collections } : user
            )
          );
        }
      }
    } catch (error) {
      console.error('Error fetching user collections:', error);
    } finally {
      setLoadingCollections(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const toggleUserExpand = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      // Load collections if not already loaded
      const user = users.find(u => u.userId === userId);
      if (user && !user.collections) {
        fetchUserCollections(userId);
      }
    }
    setExpandedUsers(newExpanded);
  };

  const toggleCollectionVisibility = async (userId: string, collectionId: string, currentIsPublic: boolean) => {
    try {
      const response = await fetch(`/api/admin/collections/${userId}/${collectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublic: !currentIsPublic
        }),
      });

      if (response.ok) {
        // Update local state
        setUsers(prev =>
          prev.map(user => {
            if (user.userId === userId && user.collections) {
              return {
                ...user,
                collections: user.collections.map(col =>
                  col.id === collectionId
                    ? { ...col, isPublic: !currentIsPublic }
                    : col
                )
              };
            }
            return user;
          })
        );
      } else {
        console.error('Failed to update collection visibility');
        alert('コレクションの公開設定の変更に失敗しました');
      }
    } catch (error) {
      console.error('Error toggling collection visibility:', error);
      alert('エラーが発生しました');
    }
  };

  const exportData = async (format: 'json' | 'csv' | 'txt') => {
    try {
      const response = await fetch(`/api/admin/users/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const totalCollections = users.reduce((sum, user) => sum + user.collectionsCount, 0);
  const totalItems = users.reduce((sum, user) => sum + user.itemsCount, 0);
  const totalSize = users.reduce((sum, user) => sum + user.totalSize, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FiUsers />
            ユーザー管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            全ユーザーのコレクション作成状況を確認できます
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <FiRefreshCw />
            更新
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              <FiDownload />
              エクスポート
            </button>
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={() => exportData('json')}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
              >
                JSON
              </button>
              <button
                onClick={() => exportData('csv')}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                CSV
              </button>
              <button
                onClick={() => exportData('txt')}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
              >
                TXT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">総ユーザー数</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <FiUsers className="text-3xl text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">総コレクション数</p>
              <p className="text-2xl font-bold">{totalCollections}</p>
            </div>
            <FiFolder className="text-3xl text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">総アイテム数</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
            <FiImage className="text-3xl text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">総データサイズ</p>
              <p className="text-2xl font-bold">{formatBytes(totalSize)}</p>
            </div>
            <FiFolder className="text-3xl text-orange-500" />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  コレクション
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  アイテム
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  最終更新
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <>
                  <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleUserExpand(user.userId)}
                          className="mr-2 text-gray-400 hover:text-gray-600"
                        >
                          {expandedUsers.has(user.userId) ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.name || user.email || user.userId}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email || `ID: ${user.userId.substring(0, 20)}...`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {user.collectionsCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {user.itemsCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FiClock className="text-xs" />
                        {formatDate(user.lastActivity)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          const baseUrl = window.location.origin;
                          const collectionUrl = `${baseUrl}/api/iiif/2/public/${user.userId}/collections`;
                          const selfMuseumUrl = `https://self-museum.cultural.jp/?collection=${encodeURIComponent(collectionUrl)}`;
                          window.open(selfMuseumUrl, '_blank');
                        }}
                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
                      >
                        <FiExternalLink />
                        Self Museum
                      </button>
                    </td>
                  </tr>
                  {expandedUsers.has(user.userId) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                        {loadingCollections.has(user.userId) ? (
                          <div className="flex items-center justify-center py-4">
                            <FiRefreshCw className="animate-spin mr-2" />
                            コレクションを読み込み中...
                          </div>
                        ) : user.collections && user.collections.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="font-semibold mb-2">コレクション一覧:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {user.collections.map((collection) => (
                                <div
                                  key={collection.id}
                                  className="bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h5 className="font-medium text-sm flex-1">{collection.name}</h5>
                                    <button
                                      onClick={() => toggleCollectionVisibility(user.userId, collection.id, collection.isPublic)}
                                      className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                      title={collection.isPublic ? '公開中（クリックで非公開に変更）' : '非公開中（クリックで公開に変更）'}
                                    >
                                      {collection.isPublic ? (
                                        <FiGlobe className="text-green-500 text-sm" />
                                      ) : (
                                        <FiLock className="text-gray-500 text-sm" />
                                      )}
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                    <div className="flex items-center gap-1">
                                      <FiImage />
                                      <span>{collection.itemsCount} アイテム</span>
                                    </div>
                                    {collection.createdAt && (
                                      <div className="flex items-center gap-1">
                                        <FiClock />
                                        <span>{formatDate(collection.createdAt)}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        const baseUrl = window.location.origin;
                                        const collectionUrl = `${baseUrl}/api/iiif/2/collection/${user.userId}_${collection.id}`;
                                        const selfMuseumUrl = `https://self-museum.cultural.jp/?collection=${encodeURIComponent(collectionUrl)}`;
                                        window.open(selfMuseumUrl, '_blank');
                                      }}
                                      className="text-xs text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
                                    >
                                      <FiExternalLink />
                                      表示
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            コレクションがありません
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <FiUsers className="mx-auto text-6xl text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            ユーザーデータがありません
          </p>
        </div>
      )}
    </div>
  );
}
