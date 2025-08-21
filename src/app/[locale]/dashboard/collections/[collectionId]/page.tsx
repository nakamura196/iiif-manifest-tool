'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ImageUploader from '@/components/ImageUploader';
import AuthTokenModal from '@/components/AuthTokenModal';
import ItemEditModal from '@/components/ItemEditModal';
import CollectionEditModal from '@/components/CollectionEditModal';
import { FiArrowLeft, FiPlus, FiEye, FiCopy, FiTrash2, FiKey, FiLock, FiGlobe, FiEdit2, FiBook, FiSettings, FiExternalLink, FiMoreVertical, FiMap, FiGrid } from 'react-icons/fi';
import Link from 'next/link';

// Dynamic import for map component to avoid SSR issues
const CollectionMap = dynamic(() => import('@/components/CollectionMap'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96">地図を読み込み中...</div>
});

interface Item {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  thumbnail?: string;
  location?: {
    latitude: number;
    longitude: number;
    label?: string;
  };
  images: Array<{
    id: string;
    url: string;
    width: number;
    height: number;
  }>;
}

interface PageProps {
  params: Promise<{ collectionId: string }>;
}

export default function CollectionPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  interface UploadedImage {
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
    mimeType: string;
    infoJson?: string;
    isIIIF?: boolean;
    iiifBaseUrl?: string;
  }
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemIsPublic, setItemIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showCollectionEditModal, setShowCollectionEditModal] = useState(false);
  const [collectionName, setCollectionName] = useState<string>('コレクション');
  const [collectionDescription, setCollectionDescription] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showItemDropdown, setShowItemDropdown] = useState<string | null>(null);
  const itemDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const fetchCollectionData = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}`);
      if (response.ok) {
        const data = await response.json();
        setCollectionName(data.name || 'コレクション');
        setCollectionDescription(data.description || '');
      }
    } catch (error) {
      console.error('Error fetching collection:', error);
    }
  }, [resolvedParams.collectionId]);

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items?userId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.collectionId, session?.user?.id]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchCollectionData();
      fetchItems();
    }
  }, [session, fetchItems, fetchCollectionData]);

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
      if (showItemDropdown) {
        const dropdownRef = itemDropdownRefs.current[showItemDropdown];
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
          setShowItemDropdown(null);
        }
      }
    }

    if (showItemDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showItemDropdown]);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        return response.json();
      }
      throw new Error('Upload failed');
    });

    try {
      const results = await Promise.all(uploadPromises);
      setUploadedImages([...uploadedImages, ...results]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlAdd = async (url: string) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      const img = new Image();
      img.onload = () => {
        setUploadedImages([
          ...uploadedImages,
          {
            url,
            width: img.width,
            height: img.height,
            mimeType: contentType,
          },
        ]);
      };
      img.src = url;
    } catch (error) {
      console.error('Error adding URL:', error);
    }
  };

  const handleInfoJsonAdd = async (infoJsonUrl: string) => {
    try {
      const response = await fetch(infoJsonUrl);
      const infoJson = await response.json();
      
      // For IIIF images, construct the full image URL
      const baseUrl = infoJson.id || infoJson['@id'];
      // Remove trailing slash if present
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      // Create the full IIIF image URL
      const imageUrl = `${cleanBaseUrl}/full/full/0/default.jpg`;
      
      setUploadedImages([
        ...uploadedImages,
        {
          url: imageUrl,
          width: infoJson.width,
          height: infoJson.height,
          mimeType: 'image/jpeg',
          infoJson: JSON.stringify(infoJson),
          isIIIF: true,  // Mark as IIIF image
          iiifBaseUrl: cleanBaseUrl  // Store the base URL for service info
        },
      ]);
    } catch (error) {
      console.error('Error adding info.json:', error);
    }
  };

  const createItem = async () => {
    if (!itemTitle || uploadedImages.length === 0) return;

    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: itemTitle,
          description: itemDescription,
          images: uploadedImages,
          isPublic: itemIsPublic,
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setItems([newItem, ...items]);
        setShowCreateModal(false);
        setItemTitle('');
        setItemDescription('');
        setItemIsPublic(true);
        setUploadedImages([]);
      }
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };


  const openInMirador = (item: Item) => {
    // Generate manifest URL using new IIIF structure
    const combinedId = `${session?.user?.id}_${resolvedParams.collectionId}_${item.id}`;
    const manifestUrl = `${window.location.origin}/api/iiif/${combinedId}/manifest`;
    const encodedUrl = encodeURIComponent(manifestUrl);
    const miradorUrl = `/mirador/index.html?manifest=${encodedUrl}`;
    window.open(miradorUrl, '_blank');
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('このアイテムを削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/ja/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0">
            <FiArrowLeft className="text-xl" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold flex-1">{collectionName}</h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
          <button
            onClick={() => {
              const combinedId = `${session?.user?.id}_${resolvedParams.collectionId}`;
              const collectionUrl = `${window.location.origin}/api/iiif/2/collection/${combinedId}`;
              const selfMuseumUrl = `https://self-museum.cultural.jp/?collection=${encodeURIComponent(collectionUrl)}`;
              window.open(selfMuseumUrl, '_blank');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm sm:text-base"
            title="Self Museumで表示"
          >
            <FiExternalLink className="text-base sm:text-lg" />
            <span className="hidden sm:inline">Self Museum</span>
            <span className="sm:hidden">Museum</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
          >
            <FiPlus className="text-base sm:text-lg" />
            <span className="hidden sm:inline">新規アイテム</span>
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
                  const combinedId = `${session?.user?.id}_${resolvedParams.collectionId}`;
                  const collectionUrl = `${window.location.origin}/api/iiif/3/collection/${combinedId}`;
                  const encodedUrl = encodeURIComponent(collectionUrl);
                  const miradorUrl = `/mirador/index.html?manifest=${encodedUrl}`;
                  window.open(miradorUrl, '_blank');
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <FiBook />
                ビューアで見る
              </button>
              <button
                onClick={() => {
                  const combinedId = `${session?.user?.id}_${resolvedParams.collectionId}`;
                  const collectionUrl = `${window.location.origin}/api/iiif/3/collection/${combinedId}`;
                  window.open(collectionUrl, '_blank');
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <FiEye />
                データをエクスポート
              </button>
              <button
                onClick={() => {
                  setShowCollectionEditModal(true);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <FiSettings />
                コレクション設定
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {collectionDescription && (
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300">{collectionDescription}</p>
        </div>
      )}

      {/* ビュー切り替えボタン */}
      {items.length > 0 && (
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 flex items-center gap-2 rounded-l-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FiGrid />
              <span className="hidden sm:inline">グリッド</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 flex items-center gap-2 rounded-r-lg transition-colors ${
                viewMode === 'map'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FiMap />
              <span className="hidden sm:inline">地図</span>
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            アイテムがまだありません
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            最初のアイテムを作成
          </button>
        </div>
      ) : viewMode === 'map' ? (
        <div className="h-[600px]">
          <CollectionMap
            items={items.map(item => ({
              id: item.id,
              title: item.title,
              description: item.description || undefined,
              thumbnail: item.thumbnail,
              latitude: item.location?.latitude || 0,
              longitude: item.location?.longitude || 0,
              label: item.location?.label
            }))}
            onItemClick={(itemId) => {
              setEditingItemId(itemId);
              setShowEditModal(true);
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow"
            >
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <div className="p-4 relative">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  {item.isPublic ? (
                    <FiGlobe className="text-gray-500 text-sm" title="公開" />
                  ) : (
                    <FiLock className="text-gray-500 text-sm" title="非公開" />
                  )}
                </div>
                {item.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {item.description}
                  </p>
                )}
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => {
                      setEditingItemId(item.id);
                      setShowEditModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <FiEdit2 />
                    編集
                  </button>
                  <div className="relative" ref={el => { itemDropdownRefs.current[item.id] = el; }}>
                    <button
                      onClick={() => setShowItemDropdown(showItemDropdown === item.id ? null : item.id)}
                      className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                      title="その他のオプション"
                    >
                      <FiMoreVertical />
                    </button>
                    {showItemDropdown === item.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-[100] max-w-[calc(100vw-2rem)]">
                        <button
                          onClick={() => {
                            openInMirador(item);
                            setShowItemDropdown(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm"
                        >
                          <FiBook />
                          ビューアで見る
                        </button>
                        <button
                          onClick={() => {
                            const combinedId = `${session?.user?.id}_${resolvedParams.collectionId}_${item.id}`;
                            const manifestUrl = `${window.location.origin}/api/iiif/${combinedId}/manifest`;
                            window.open(manifestUrl, '_blank');
                            setShowItemDropdown(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm"
                        >
                          <FiEye />
                          データをエクスポート
                        </button>
                        <button
                          onClick={() => {
                            const combinedId = `${session?.user?.id}_${resolvedParams.collectionId}_${item.id}`;
                            const manifestUrl = `${window.location.origin}/api/iiif/${combinedId}/manifest`;
                            navigator.clipboard.writeText(manifestUrl);
                            setShowItemDropdown(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm"
                        >
                          <FiCopy />
                          URLをコピー
                        </button>
                        {!item.isPublic && (
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowAuthModal(true);
                              setShowItemDropdown(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm"
                          >
                            <FiKey />
                            認証設定
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`「${item.title}」を削除してもよろしいですか？`)) {
                              handleDelete(item.id);
                              setShowItemDropdown(null);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm text-red-600 dark:text-red-400"
                        >
                          <FiTrash2 />
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">新規アイテム作成</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  タイトル *
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="アイテムのタイトル"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">説明</label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                  placeholder="アイテムの説明（任意）"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={itemIsPublic}
                  onChange={(e) => setItemIsPublic(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm">
                  このアイテムを公開する
                </label>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">画像を追加</h3>
              <ImageUploader
                onUpload={handleUpload}
                onUrlAdd={handleUrlAdd}
                onInfoJsonAdd={handleInfoJsonAdd}
              />
            </div>

            {uploadedImages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  アップロード済み画像 ({uploadedImages.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.isIIIF && img.iiifBaseUrl ? `${img.iiifBaseUrl}/full/400,/0/default.jpg` : img.url}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <button
                        onClick={() => {
                          setUploadedImages(uploadedImages.filter((_, i) => i !== index));
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setItemTitle('');
                  setItemDescription('');
                  setItemIsPublic(true);
                  setUploadedImages([]);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={createItem}
                disabled={!itemTitle || uploadedImages.length === 0 || uploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              >
                {uploading ? 'アップロード中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && selectedItem && (
        <AuthTokenModal
          itemId={`${session?.user?.id}_${resolvedParams.collectionId}_${selectedItem.id}`}
          itemTitle={selectedItem.title}
          onClose={() => {
            setShowAuthModal(false);
            setSelectedItem(null);
          }}
        />
      )}

      {showEditModal && editingItemId && (
        <ItemEditModal
          itemId={editingItemId}
          collectionId={resolvedParams.collectionId}
          ownerId={session?.user?.id}
          onClose={() => {
            setShowEditModal(false);
            setEditingItemId(null);
          }}
          onUpdate={() => {
            fetchItems();
          }}
        />
      )}

      {showCollectionEditModal && (
        <CollectionEditModal
          collectionId={resolvedParams.collectionId}
          onClose={() => setShowCollectionEditModal(false)}
          onUpdate={() => {
            // Refresh collection data after editing
            fetchCollectionData();
          }}
        />
      )}
    </div>
  );
}