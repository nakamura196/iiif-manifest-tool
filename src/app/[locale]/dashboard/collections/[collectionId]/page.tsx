'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import AuthTokenModal from '@/components/AuthTokenModal';
import { FiArrowLeft, FiPlus, FiEye, FiCopy, FiTrash2, FiKey, FiLock, FiGlobe, FiEdit2, FiBook, FiSettings, FiExternalLink, FiMoreVertical, FiMap, FiGrid, FiImage } from 'react-icons/fi';
import Link from 'next/link';
import { IIIFItemResponse, IIIFTextHelpers } from '@/types/iiif';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useSnackbar } from '@/contexts/SnackbarContext';

// Dynamic import for map component to avoid SSR issues
const LoadingComponent = () => {
  const t = useTranslations();
  return <div className="flex items-center justify-center h-96">{t('Collection.mapLoading')}</div>;
};

const CollectionMap = dynamic(() => import('@/components/CollectionMap'), {
  ssr: false,
  loading: LoadingComponent
});

// Using IIIFItemResponse from common types

interface PageProps {
  params: Promise<{ collectionId: string }>;
}

export default function CollectionPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const [items, setItems] = useState<IIIFItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<IIIFItemResponse | null>(null);
  const [collectionName, setCollectionName] = useState<string>('');
  const [collectionDescription, setCollectionDescription] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showItemDropdown, setShowItemDropdown] = useState<string | null>(null);
  const itemDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean; 
    itemId: string; 
    title: string;
    isLoading?: boolean;
  }>({
    isOpen: false,
    itemId: '',
    title: '',
    isLoading: false
  });
  const { showSnackbar } = useSnackbar();

  const fetchCollectionData = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}`);
      if (response.ok) {
        const data = await response.json();
        // Use IIIF v3 format
        const displayName = IIIFTextHelpers.getText(data.label) || t('Common.collection');
        const displayDescription = IIIFTextHelpers.getText(data.summary) || '';
        
        setCollectionName(displayName);
        setCollectionDescription(displayDescription);
      }
    } catch (error) {
      console.error('Error fetching collection:', error);
    }
  }, [resolvedParams.collectionId, t]);

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



  const openInMirador = (item: IIIFItemResponse) => {
    // Generate manifest URL using IIIF v3
    const combinedId = `${session?.user?.id}_${resolvedParams.collectionId}_${item.id}`;
    const manifestUrl = `${window.location.origin}/api/iiif/3/${combinedId}/manifest`;
    const encodedUrl = encodeURIComponent(manifestUrl);
    const miradorUrl = `/mirador/index.html?manifest=${encodedUrl}`;
    window.open(miradorUrl, '_blank');
  };

  const handleDelete = async (itemId: string) => {
    // 削除開始時にローディング状態にする
    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter(item => item.id !== itemId));
        showSnackbar('アイテムを削除しました', 'success');
        // 成功時にダイアログを閉じる
        setDeleteDialog({ isOpen: false, itemId: '', title: '', isLoading: false });
      } else {
        showSnackbar('削除に失敗しました', 'error');
        setDeleteDialog(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      showSnackbar('削除中にエラーが発生しました', 'error');
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('Common.loading')}</div>
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
            title={t('Dashboard.viewInSelfMuseum')}
          >
            <FiExternalLink className="text-base sm:text-lg" />
            <span className="hidden sm:inline">Self Museum</span>
            <span className="sm:hidden">Museum</span>
          </button>
          <Link
            href={`/ja/dashboard/collections/${resolvedParams.collectionId}/items/new`}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
          >
            <FiPlus className="text-base sm:text-lg" />
            <span className="hidden sm:inline">{t('Collection.newItem')}</span>
            <span className="sm:hidden">{t('Dashboard.new')}</span>
          </Link>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title={t('Collection.moreOptions')}
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
                {t('Dashboard.viewInViewer')}
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
                {t('Dashboard.exportData')}
              </button>
              <button
                onClick={() => {
                  const locale = window.location.pathname.split('/')[1] || 'ja';
                  router.push(`/${locale}/dashboard/collections/${resolvedParams.collectionId}/edit`);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                <FiSettings />
                {t('Collection.collectionSettings')}
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
              <span className="hidden sm:inline">{t('Collection.grid')}</span>
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
              <span className="hidden sm:inline">{t('Collection.map')}</span>
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('Collection.noItems')}
          </p>
          <Link
            href={`/ja/dashboard/collections/${resolvedParams.collectionId}/items/new`}
            className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('Collection.createFirstItem')}
          </Link>
        </div>
      ) : viewMode === 'map' ? (
        <div className="h-[600px]">
          <CollectionMap
            items={items.map(item => ({
              id: item.id,
              title: IIIFTextHelpers.getText(item.label) || 'Untitled',
              description: IIIFTextHelpers.getText(item.summary) || undefined,
              thumbnail: item.thumbnail,
              latitude: item.location?.latitude || 0,
              longitude: item.location?.longitude || 0,
              label: item.location?.label
            }))}
            onItemClick={(itemId) => {
              const locale = window.location.pathname.split('/')[1] || 'ja';
              router.push(`/${locale}/dashboard/collections/${resolvedParams.collectionId}/items/${itemId}/edit`);
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
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={IIIFTextHelpers.getText(item.label) || 'Item'}
                  className="w-full h-48 object-cover rounded-t-lg bg-gray-100"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg flex items-center justify-center">
                  <FiImage className="text-4xl text-gray-400" />
                </div>
              )}
              <div className="p-4 relative">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">{IIIFTextHelpers.getText(item.label) || 'Untitled'}</h3>
                  {item.isPublic ? (
                    <FiGlobe className="text-gray-500 text-sm" title={t('Collection.public')} />
                  ) : (
                    <FiLock className="text-gray-500 text-sm" title={t('Collection.private')} />
                  )}
                </div>
                {item.summary && IIIFTextHelpers.getText(item.summary) && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {IIIFTextHelpers.getText(item.summary)}
                  </p>
                )}
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => {
                      const locale = window.location.pathname.split('/')[1] || 'ja';
                      router.push(`/${locale}/dashboard/collections/${resolvedParams.collectionId}/items/${item.id}/edit`);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <FiEdit2 />
                    {t('Collection.edit')}
                  </button>
                  <div className="relative" ref={el => { itemDropdownRefs.current[item.id] = el; }}>
                    <button
                      onClick={() => setShowItemDropdown(showItemDropdown === item.id ? null : item.id)}
                      className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                      title={t('Collection.moreOptions')}
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
                          {t('Dashboard.viewInViewer')}
                        </button>
                        <button
                          onClick={() => {
                            const combinedId = `${session?.user?.id}_${resolvedParams.collectionId}_${item.id}`;
                            const manifestUrl = `${window.location.origin}/api/iiif/3/${combinedId}/manifest`;
                            window.open(manifestUrl, '_blank');
                            setShowItemDropdown(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm"
                        >
                          <FiEye />
                          {t('Dashboard.exportData')}
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
                          {t('Collection.copyUrl')}
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
                            {t('Collection.authSettings')}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDeleteDialog({
                              isOpen: true,
                              itemId: item.id,
                              title: IIIFTextHelpers.getText(item.label) || 'item'
                            });
                            setShowItemDropdown(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-sm text-red-600 dark:text-red-400"
                        >
                          <FiTrash2 />
                          {t('Collection.delete')}
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


      {showAuthModal && selectedItem && (
        <AuthTokenModal
          itemId={`${session?.user?.id}_${resolvedParams.collectionId}_${selectedItem.id}`}
          itemTitle={IIIFTextHelpers.getText(selectedItem.label) || 'Item'}
          onClose={() => {
            setShowAuthModal(false);
            setSelectedItem(null);
          }}
        />
      )}
      
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, itemId: '', title: '', isLoading: false })}
        onConfirm={() => handleDelete(deleteDialog.itemId)}
        title="アイテムの削除"
        message={`「${deleteDialog.title}」を削除してもよろしいですか？この操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        variant="danger"
        isLoading={deleteDialog.isLoading}
      />

    </div>
  );
}