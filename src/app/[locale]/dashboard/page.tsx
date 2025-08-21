'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiFolder, FiImage, FiLock, FiGlobe, FiBook, FiExternalLink, FiEye, FiSettings, FiMoreVertical, FiEdit, FiTrash2, FiSearch, FiFilter, FiCalendar, FiClock } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState<string | null>(null);
  const collectionDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'name'>('created');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

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
      if (showFilterMenu && filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    }

    if (showCollectionDropdown || showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCollectionDropdown, showFilterMenu]);

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

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // コレクション一覧を再取得
        await fetchCollections();
      } else {
        console.error('Failed to delete collection');
        alert(t('Dashboard.deleteCollectionFailed'));
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert(t('Dashboard.deleteCollectionError'));
    }
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
        <div className="text-lg">{t('Common.loading')}</div>
      </div>
    );
  }

  // Filter and sort collections
  const filteredAndSortedCollections = collections
    .filter(collection => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = collection.name.toLowerCase().includes(query);
        const matchesDescription = collection.description?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesDescription) return false;
      }
      
      // Visibility filter
      if (filterVisibility === 'public' && !collection.isPublic) return false;
      if (filterVisibility === 'private' && collection.isPublic) return false;
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          // For now, use createdAt as we don't have updatedAt
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div className="flex-1 w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('Dashboard.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
            {t('Dashboard.description')}
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
            title={t('Dashboard.viewInSelfMuseumTooltip')}
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
            <span className="hidden sm:inline">{t('Dashboard.newCollection')}</span>
            <span className="sm:hidden">{t('Dashboard.new')}</span>
          </button>
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
                    const userId = session?.user?.id;
                    const jsonUrl = `${window.location.origin}/api/iiif/2/public/${userId}/collections`;
                    window.open(jsonUrl, '_blank');
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <FiEye />
                  {t('Dashboard.viewData')}
                </button>
                <button
                  onClick={() => {
                    navigateToCollectionSettings();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <FiSettings />
                  {t('Dashboard.publicCollectionSettings')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder={t('Dashboard.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <div className="relative" ref={filterMenuRef}>
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
          >
            <FiFilter />
            <span>{t('Dashboard.filter')}</span>
            {(filterVisibility !== 'all' || sortBy !== 'created') && (
              <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                {filterVisibility !== 'all' ? 1 : 0} + {sortBy !== 'created' ? 1 : 0}
              </span>
            )}
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t('Dashboard.visibilitySettings')}</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={filterVisibility === 'all'}
                        onChange={() => setFilterVisibility('all')}
                        className="text-blue-500"
                      />
                      <span className="text-sm">{t('Dashboard.all')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={filterVisibility === 'public'}
                        onChange={() => setFilterVisibility('public')}
                        className="text-blue-500"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <FiGlobe className="text-xs" />
                        {t('Dashboard.publicOnly')}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={filterVisibility === 'private'}
                        onChange={() => setFilterVisibility('private')}
                        className="text-blue-500"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <FiLock className="text-xs" />
                        {t('Dashboard.privateOnly')}
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t('Dashboard.sortOrder')}</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        checked={sortBy === 'created'}
                        onChange={() => setSortBy('created')}
                        className="text-blue-500"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <FiCalendar className="text-xs" />
                        {t('Dashboard.sortByCreated')}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        checked={sortBy === 'updated'}
                        onChange={() => setSortBy('updated')}
                        className="text-blue-500"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <FiClock className="text-xs" />
                        {t('Dashboard.sortByUpdated')}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        checked={sortBy === 'name'}
                        onChange={() => setSortBy('name')}
                        className="text-blue-500"
                      />
                      <span className="text-sm">{t('Dashboard.sortByName')}</span>
                    </label>
                  </div>
                </div>
                {(filterVisibility !== 'all' || sortBy !== 'created') && (
                  <button
                    onClick={() => {
                      setFilterVisibility('all');
                      setSortBy('created');
                    }}
                    className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('Dashboard.resetFilters')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredAndSortedCollections.length === 0 ? (
        searchQuery || filterVisibility !== 'all' ? (
          <div className="text-center py-12">
            <FiSearch className="mx-auto text-6xl text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('Dashboard.noMatchingCollections')}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterVisibility('all');
                setSortBy('created');
              }}
              className="px-6 py-2 text-blue-500 hover:text-blue-600"
            >
              {t('Dashboard.clearFilters')}
            </button>
          </div>
        ) : (
        <div className="text-center py-12">
          <FiFolder className="mx-auto text-6xl text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('Dashboard.noCollections')}
          </p>
          <button
            onClick={navigateToNewCollection}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('Dashboard.createFirstCollection')}
          </button>
        </div>
        )
      ) : (
        <div>
          {searchQuery && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('Dashboard.searchResults', { query: searchQuery, count: filteredAndSortedCollections.length })}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {filteredAndSortedCollections.map((collection) => (
            <div
              key={collection.id}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow relative"
            >
              <div className="flex items-start justify-between mb-4">
                <FiFolder className="text-3xl text-blue-500" />
                {collection.isPublic ? (
                  <FiGlobe className="text-gray-500" title={t('Collection.public')} />
                ) : (
                  <FiLock className="text-gray-500" title={t('Collection.private')} />
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
                <span>{collection._count?.items || 0} {t('Dashboard.items')}</span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/ja/dashboard/collections/${collection.id}`}
                  className="flex-1 text-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  {t('Dashboard.open')}
                </Link>
                <div className="relative" ref={el => { collectionDropdownRefs.current[collection.id] = el; }}>
                  <button
                    onClick={() => setShowCollectionDropdown(showCollectionDropdown === collection.id ? null : collection.id)}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                    title={t('Collection.moreOptions')}
                  >
                    <FiMoreVertical />
                  </button>
                  {showCollectionDropdown === collection.id && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-[100] max-w-[calc(100vw-2rem)]">
                      <button
                        onClick={() => {
                          const locale = window.location.pathname.split('/')[1] || 'ja';
                          router.push(`/${locale}/dashboard/collections/${collection.id}/edit`);
                          setShowCollectionDropdown(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                      >
                        <FiEdit />
                        {t('Collection.edit')}
                      </button>
                      <button
                        onClick={() => {
                          openCollectionInMirador(collection.id);
                          setShowCollectionDropdown(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                      >
                        <FiBook />
                        {t('Dashboard.viewInViewer')}
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
                        {t('Dashboard.exportData')}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t('Collection.confirmDelete', { title: collection.name }))) {
                            handleDeleteCollection(collection.id);
                            setShowCollectionDropdown(null);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-red-600 dark:text-red-400"
                      >
                        <FiTrash2 />
                        {t('Collection.delete')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

    </div>
  );
}