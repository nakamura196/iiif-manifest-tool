'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiFolder, FiImage, FiLock, FiGlobe, FiBook, FiExternalLink, FiEye } from 'react-icons/fi';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  _count: {
    items: number;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    isPublic: true,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchCollections();
    }
  }, [session]);

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections');
      if (response.ok) {
        const data = await response.json();
        setCollections(data);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCollection),
      });

      if (response.ok) {
        const data = await response.json();
        setCollections([data, ...collections]);
        setShowCreateModal(false);
        setNewCollection({ name: '', description: '', isPublic: true });
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const openCollectionInMirador = (collectionId: string) => {
    // Generate collection manifest URL using new IIIF structure
    const combinedId = `${session?.user?.id}_${collectionId}`;
    const collectionUrl = `${window.location.origin}/api/iiif/collection/${combinedId}`;
    const encodedUrl = encodeURIComponent(collectionUrl);
    const miradorUrl = `/mirador/index.html?manifest=${encodedUrl}`;
    window.open(miradorUrl, '_blank');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">マイコレクション</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // Create a v2 public collection URL
              const userId = session?.user?.id;
              const baseUrl = `${window.location.origin}/api/iiif/2/public/${userId}/collections`;
              const selfMuseumUrl = `https://self-museum.cultural.jp/?collection=${encodeURIComponent(baseUrl)}`;
              window.open(selfMuseumUrl, '_blank');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            title="Self Museumで公開コレクションを表示"
          >
            <FiExternalLink />
            Self Museum
          </button>
          <button
            onClick={() => {
              const userId = session?.user?.id;
              const jsonUrl = `${window.location.origin}/api/iiif/2/public/${userId}/collections`;
              window.open(jsonUrl, '_blank');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            title="公開コレクション一覧JSONを表示"
          >
            <FiEye />
            JSON
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <FiPlus />
            新規コレクション
          </button>
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-12">
          <FiFolder className="mx-auto text-6xl text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            コレクションがまだありません
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            最初のコレクションを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <FiFolder className="text-3xl text-blue-500" />
                {collection.isPublic ? (
                  <FiGlobe className="text-gray-500" title="公開" />
                ) : (
                  <FiLock className="text-gray-500" title="非公開" />
                )}
              </div>
              <h3 className="text-xl font-semibold mb-2">{collection.name}</h3>
              {collection.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {collection.description}
                </p>
              )}
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <FiImage className="mr-1" />
                <span>{collection._count?.items || 0} アイテム</span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/ja/dashboard/collections/${collection.id}`}
                  className="flex-1 text-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  開く
                </Link>
                <button
                  onClick={() => openCollectionInMirador(collection.id)}
                  className="px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 text-sm"
                  title="Miradorで表示"
                >
                  <FiBook />
                </button>
                <button
                  onClick={() => {
                    const combinedId = `${session?.user?.id}_${collection.id}`;
                    const collectionUrl = `${window.location.origin}/api/iiif/collection/${combinedId}`;
                    window.open(collectionUrl, '_blank');
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  title="APIを開く"
                >
                  <FiExternalLink />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">新規コレクション</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  コレクション名 *
                </label>
                <input
                  type="text"
                  value={newCollection.name}
                  onChange={(e) =>
                    setNewCollection({ ...newCollection, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="例: 日本の古地図"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">説明</label>
                <textarea
                  value={newCollection.description}
                  onChange={(e) =>
                    setNewCollection({
                      ...newCollection,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                  placeholder="コレクションの説明（任意）"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newCollection.isPublic}
                  onChange={(e) =>
                    setNewCollection({
                      ...newCollection,
                      isPublic: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm">
                  このコレクションを公開する
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={createCollection}
                disabled={!newCollection.name}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}