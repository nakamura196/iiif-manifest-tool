'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiFolder, FiImage, FiLock, FiGlobe, FiBook, FiExternalLink, FiEye, FiSettings, FiMoreVertical } from 'react-icons/fi';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState<string | null>(null);
  const collectionDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showCollectionDropdown) {
        const dropdownRef = collectionDropdownRefs.current[showCollectionDropdown];
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
          setShowCollectionDropdown(null);
        }
      }
    }

    if (showCollectionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCollectionDropdown]);

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


  const navigateToNewCollection = () => {
    const locale = window.location.pathname.split('/')[1] || 'ja';
    router.push(`/${locale}/dashboard/collections/new`);
  };

  const navigateToCollectionSettings = () => {
    const locale = window.location.pathname.split('/')[1] || 'ja';
    router.push(`/${locale}/dashboard/collections/settings`);
  };

  const openCollectionInMirador = (collectionId: string) => {
    // Generate collection manifest URL using new IIIF structure
    const combinedId = `${session?.user?.id}_${collectionId}`;
    const collectionUrl = `${window.location.origin}/api/iiif/3/collection/${combinedId}`;
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
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div className="flex-1 w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">マイコレクション</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
            あなたの画像コレクションを管理できます
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              // Create a v2 public collection URL
              const userId = session?.user?.id;
              const baseUrl = `${window.location.origin}/api/iiif/2/public/${userId}/collections`;
              const selfMuseumUrl = `https://self-museum.cultural.jp/?collection=${encodeURIComponent(baseUrl)}`;
              window.open(selfMuseumUrl, '_blank');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm sm:text-base"
            title="Self Museumで公開コレクションを表示"
          >
            <FiExternalLink className="text-base sm:text-lg" />
            <span className="hidden sm:inline">Self Museum</span>
            <span className="sm:hidden">Museum</span>
          </button>
          <button
            onClick={navigateToNewCollection}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
          >
            <FiPlus className="text-base sm:text-lg" />
            <span className="hidden sm:inline">新規コレクション</span>
            <span className="sm:hidden">新規</span>
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="その他のオプション"
            >
              <FiMoreVertical className="text-xl" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50 max-w-[calc(100vw-2rem)]">
                <button
                  onClick={() => {
                    const userId = session?.user?.id;
                    const jsonUrl = `${window.location.origin}/api/iiif/2/public/${userId}/collections`;
                    window.open(jsonUrl, '_blank');
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <FiEye />
                  データをエクスポート
                </button>
                <button
                  onClick={() => {
                    navigateToCollectionSettings();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <FiSettings />
                  公開コレクション設定
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-12">
          <FiFolder className="mx-auto text-6xl text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            コレクションがまだありません
          </p>
          <button
            onClick={navigateToNewCollection}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            最初のコレクションを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow relative"
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
                <div className="relative" ref={el => { collectionDropdownRefs.current[collection.id] = el; }}>
                  <button
                    onClick={() => setShowCollectionDropdown(showCollectionDropdown === collection.id ? null : collection.id)}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                    title="その他のオプション"
                  >
                    <FiMoreVertical />
                  </button>
                  {showCollectionDropdown === collection.id && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-[100] max-w-[calc(100vw-2rem)]">
                      <button
                        onClick={() => {
                          openCollectionInMirador(collection.id);
                          setShowCollectionDropdown(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                      >
                        <FiBook />
                        ビューアで見る
                      </button>
                      <button
                        onClick={() => {
                          const combinedId = `${session?.user?.id}_${collection.id}`;
                          const collectionUrl = `${window.location.origin}/api/iiif/3/collection/${combinedId}`;
                          window.open(collectionUrl, '_blank');
                          setShowCollectionDropdown(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                      >
                        <FiExternalLink />
                        データをエクスポート
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}