'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiInfo, FiSettings, FiGlobe, FiUsers, FiLoader } from 'react-icons/fi';
import Link from 'next/link';

interface CollectionEditPageProps {
  params: Promise<{
    locale: string;
    collectionId: string;
  }>;
}

interface CollectionData {
  label?: { [key: string]: string[] };
  summary?: { [key: string]: string[] };
  isPublic: boolean;
  metadata?: {
    attribution?: string;
    requiredStatement?: {
      label: { [key: string]: string[] | undefined };
      value: { [key: string]: string[] | undefined };
    };
    rights?: string;
    seeAlso?: Array<{
      id: string;
      type: string;
      format?: string;
      label?: { [key: string]: string[] | undefined };
    }>;
    homepage?: Array<{
      id: string;
      type: string;
      label?: { [key: string]: string[] | undefined };
    }>;
    provider?: Array<{
      id?: string;
      type: string;
      label?: { [key: string]: string[] | undefined };
      homepage?: Array<{
        id: string;
        type: string;
        label?: { [key: string]: string[] | undefined };
      }>;
    }>;
    customFields?: Array<{
      label: { [key: string]: string[] };
      value: { [key: string]: string[] };
    }>;
  };
}

export default function CollectionEditPage({ params }: CollectionEditPageProps) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collection, setCollection] = useState<CollectionData>({
    label: {},
    summary: {},
    isPublic: true,
    metadata: {}
  });
  const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'settings' | 'access'>('basic');

  const fetchCollection = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}`);
      if (response.ok) {
        const data = await response.json();
        setCollection({
          label: data.label || {},
          summary: data.summary || {},
          isPublic: data.isPublic ?? true,
          metadata: data.metadata || {}
        });
      }
    } catch (error) {
      console.error('Error fetching collection:', error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.collectionId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCollection();
    } else if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, fetchCollection, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collection),
      });

      if (response.ok) {
        router.push(`/${resolvedParams.locale}/dashboard/collections/${resolvedParams.collectionId}`);
      } else {
        console.error('Failed to update collection');
      }
    } catch (error) {
      console.error('Error updating collection:', error);
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/${resolvedParams.locale}/dashboard/collections/${resolvedParams.collectionId}`}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiArrowLeft className="text-xl" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">コレクション設定</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!collection.label?.ja?.[0] || saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                {saving ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiSave />
                )}
                <span className="hidden sm:inline">{saving ? t('CollectionEdit.saving') : t('CollectionEdit.save')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sticky top-20">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'basic'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiInfo className="text-lg" />
                  <span>基本情報</span>
                </button>
                <button
                  onClick={() => setActiveTab('additional')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'additional'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiPlus className="text-lg" />
                  <span>追加情報</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiSettings className="text-lg" />
                  <span>詳細設定</span>
                </button>
                <button
                  onClick={() => setActiveTab('access')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'access'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiUsers className="text-lg" />
                  <span>アクセス設定</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'basic' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiInfo />
                  基本情報
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      多言語対応：日本語と英語でコレクションのタイトルと説明を設定できます。
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 日本語設定 */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">日本語</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          タイトル *
                        </label>
                        <input
                          type="text"
                          value={collection.label?.ja?.[0] || ''}
                          onChange={(e) => setCollection({ 
                            ...collection, 
                            label: { 
                              ...collection.label,
                              ja: [e.target.value]
                            } 
                          })}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder="コレクションのタイトル（日本語）"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">説明</label>
                        <textarea
                          value={collection.summary?.ja?.[0] || ''}
                          onChange={(e) => setCollection({ 
                            ...collection, 
                            summary: { 
                              ...collection.summary,
                              ja: e.target.value ? [e.target.value] : []
                            } 
                          })}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          rows={3}
                          placeholder="コレクションの説明（日本語）"
                        />
                      </div>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* 英語設定 */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">English</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={collection.label?.en?.[0] || ''}
                          onChange={(e) => setCollection({ 
                            ...collection, 
                            label: { 
                              ...collection.label,
                              en: e.target.value ? [e.target.value] : []
                            } 
                          })}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder="Collection title (English)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          value={collection.summary?.en?.[0] || ''}
                          onChange={(e) => setCollection({ 
                            ...collection, 
                            summary: { 
                              ...collection.summary,
                              en: e.target.value ? [e.target.value] : []
                            } 
                          })}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          rows={3}
                          placeholder="Collection description (English)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'additional' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiPlus />
                  追加情報
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      カスタムフィールドも多言語対応しています。日本語と英語で項目名と値を設定できます。
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {collection.metadata?.customFields?.map((field, index) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">カスタムフィールド {index + 1}</h4>
                          <button
                            onClick={() => {
                              const newFields = collection.metadata?.customFields?.filter((_, i) => i !== index) || [];
                              setCollection({
                                ...collection,
                                metadata: { ...collection.metadata, customFields: newFields }
                              });
                            }}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">項目名（日本語）</label>
                            <input
                              type="text"
                              value={field.label?.ja?.[0] || ''}
                              onChange={(e) => {
                                const newFields = [...(collection.metadata?.customFields || [])];
                                newFields[index].label = {
                                  ...newFields[index].label,
                                  ja: e.target.value ? [e.target.value] : []
                                };
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, customFields: newFields }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="例: 所蔵番号"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Label (English)</label>
                            <input
                              type="text"
                              value={field.label?.en?.[0] || ''}
                              onChange={(e) => {
                                const newFields = [...(collection.metadata?.customFields || [])];
                                newFields[index].label = {
                                  ...newFields[index].label,
                                  en: e.target.value ? [e.target.value] : []
                                };
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, customFields: newFields }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="e.g. Accession Number"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">値（日本語）</label>
                            <input
                              type="text"
                              value={field.value?.ja?.[0] || ''}
                              onChange={(e) => {
                                const newFields = [...(collection.metadata?.customFields || [])];
                                newFields[index].value = {
                                  ...newFields[index].value,
                                  ja: e.target.value ? [e.target.value] : []
                                };
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, customFields: newFields }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="例: ABC-123"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value (English)</label>
                            <input
                              type="text"
                              value={field.value?.en?.[0] || ''}
                              onChange={(e) => {
                                const newFields = [...(collection.metadata?.customFields || [])];
                                newFields[index].value = {
                                  ...newFields[index].value,
                                  en: e.target.value ? [e.target.value] : []
                                };
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, customFields: newFields }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="e.g. ABC-123"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => {
                        const newFields = [...(collection.metadata?.customFields || []), { label: {}, value: {} }];
                        setCollection({
                          ...collection,
                          metadata: { ...collection.metadata, customFields: newFields }
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                    >
                      <FiPlus />
                      カスタムフィールドを追加
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ここで追加した情報は、コレクションの詳細情報として表示されます。
                      所蔵番号、分類、テーマなど、コレクションに関する様々な情報を自由に追加できます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiSettings />
                  詳細設定
                </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        提供者情報
                      </label>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">日本語</label>
                            <input
                              type="text"
                              value={collection.metadata?.provider?.[0]?.label?.ja?.[0] || ''}
                              onChange={(e) => {
                                const currentProvider = collection.metadata?.provider?.[0] || { type: 'Agent', label: {} };
                                const provider = [{
                                  ...currentProvider,
                                  type: 'Agent',
                                  label: {
                                    ...currentProvider.label,
                                    ja: e.target.value ? [e.target.value] : []
                                  }
                                }];
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, provider }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="例: メトロポリタン美術館"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">English</label>
                            <input
                              type="text"
                              value={collection.metadata?.provider?.[0]?.label?.en?.[0] || ''}
                              onChange={(e) => {
                                const currentProvider = collection.metadata?.provider?.[0] || { type: 'Agent', label: {} };
                                const provider = [{
                                  ...currentProvider,
                                  type: 'Agent',
                                  label: {
                                    ...currentProvider.label,
                                    en: e.target.value ? [e.target.value] : []
                                  }
                                }];
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, provider }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="e.g. Metropolitan Museum of Art"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ホームページ URL</label>
                          <input
                            type="url"
                            value={collection.metadata?.provider?.[0]?.homepage?.[0]?.id || ''}
                            onChange={(e) => {
                              const currentProvider = collection.metadata?.provider?.[0] || { type: 'Agent', label: {} };
                              const provider = [{
                                ...currentProvider,
                                type: 'Agent',
                                homepage: e.target.value ? [{
                                  id: e.target.value,
                                  type: 'Text'
                                }] : undefined
                              }];
                              setCollection({
                                ...collection,
                                metadata: { ...collection.metadata, provider }
                              });
                            }}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            placeholder="https://www.metmuseum.org/"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        帰属表示 (Attribution)
                      </label>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ラベル</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input
                                type="text"
                                value={collection.metadata?.requiredStatement?.label?.ja?.[0] || ''}
                                onChange={(e) => {
                                  const currentStatement = collection.metadata?.requiredStatement || {
                                    label: {},
                                    value: {}
                                  };
                                  setCollection({
                                    ...collection,
                                    metadata: {
                                      ...collection.metadata,
                                      requiredStatement: {
                                        ...currentStatement,
                                        label: {
                                          ...currentStatement.label,
                                          ja: e.target.value ? [e.target.value] : []
                                        }
                                      }
                                    }
                                  });
                                }}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                placeholder="日本語（例: 帰属）"
                              />
                              <input
                                type="text"
                                value={collection.metadata?.requiredStatement?.label?.en?.[0] || collection.metadata?.requiredStatement?.label?.none?.[0] || ''}
                                onChange={(e) => {
                                  const currentStatement = collection.metadata?.requiredStatement || {
                                    label: {},
                                    value: {}
                                  };
                                  setCollection({
                                    ...collection,
                                    metadata: {
                                      ...collection.metadata,
                                      requiredStatement: {
                                        ...currentStatement,
                                        label: {
                                          ...currentStatement.label,
                                          en: e.target.value ? [e.target.value] : []
                                        }
                                      }
                                    }
                                  });
                                }}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                placeholder="English (e.g. Attribution)"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">値</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <textarea
                                value={collection.metadata?.requiredStatement?.value?.ja?.[0] || ''}
                                onChange={(e) => {
                                  const currentStatement = collection.metadata?.requiredStatement || {
                                    label: {},
                                    value: {}
                                  };
                                  setCollection({
                                    ...collection,
                                    metadata: {
                                      ...collection.metadata,
                                      requiredStatement: {
                                        ...currentStatement,
                                        value: {
                                          ...currentStatement.value,
                                          ja: e.target.value ? [e.target.value] : []
                                        }
                                      }
                                    }
                                  });
                                }}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                rows={2}
                                placeholder="日本語（例: メトロポリタン美術館）"
                              />
                              <textarea
                                value={collection.metadata?.requiredStatement?.value?.en?.[0] || ''}
                                onChange={(e) => {
                                  const currentStatement = collection.metadata?.requiredStatement || {
                                    label: {},
                                    value: {}
                                  };
                                  setCollection({
                                    ...collection,
                                    metadata: {
                                      ...collection.metadata,
                                      requiredStatement: {
                                        ...currentStatement,
                                        value: {
                                          ...currentStatement.value,
                                          en: e.target.value ? [e.target.value] : []
                                        }
                                      }
                                    }
                                  });
                                }}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                rows={2}
                                placeholder="English (e.g. Metropolitan Museum of Art)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        ライセンス情報
                      </label>
                      <input
                        type="text"
                        value={collection.metadata?.rights || ''}
                        onChange={(e) => setCollection({
                          ...collection,
                          metadata: { ...collection.metadata, rights: e.target.value }
                        })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder="例: https://creativecommons.org/licenses/by/4.0/"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        関連ウェブサイト
                      </label>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">URL</label>
                          <input
                            type="url"
                            value={collection.metadata?.homepage?.[0]?.id || ''}
                            onChange={(e) => {
                              const currentHomepage = collection.metadata?.homepage?.[0] || { id: '', type: 'Text', label: {} };
                              const homepage = e.target.value ? [{
                                ...currentHomepage,
                                id: e.target.value,
                                type: 'Text'
                              }] : undefined;
                              setCollection({
                                ...collection,
                                metadata: { ...collection.metadata, homepage }
                              });
                            }}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            placeholder="https://example.org"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ラベル</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              value={collection.metadata?.homepage?.[0]?.label?.ja?.[0] || ''}
                              onChange={(e) => {
                                const currentHomepage = collection.metadata?.homepage?.[0] || { id: '', type: 'Text', label: {} };
                                const homepage = [{
                                  ...currentHomepage,
                                  id: currentHomepage.id || '',
                                  label: {
                                    ...currentHomepage.label,
                                    ja: e.target.value ? [e.target.value] : []
                                  }
                                }];
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, homepage }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="日本語（例: ホームページ）"
                            />
                            <input
                              type="text"
                              value={collection.metadata?.homepage?.[0]?.label?.en?.[0] || ''}
                              onChange={(e) => {
                                const currentHomepage = collection.metadata?.homepage?.[0] || { id: '', type: 'Text', label: {} };
                                const homepage = [{
                                  ...currentHomepage,
                                  id: currentHomepage.id || '',
                                  label: {
                                    ...currentHomepage.label,
                                    en: e.target.value ? [e.target.value] : []
                                  }
                                }];
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, homepage }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="English (e.g. Homepage)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        関連資料
                      </label>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">URL</label>
                          <input
                            type="url"
                            value={collection.metadata?.seeAlso?.[0]?.id || ''}
                            onChange={(e) => {
                              const currentSeeAlso = collection.metadata?.seeAlso?.[0] || { type: 'Dataset', format: 'application/json', label: {} };
                              const seeAlso = e.target.value ? [{
                                ...currentSeeAlso,
                                id: e.target.value
                              }] : undefined;
                              setCollection({
                                ...collection,
                                metadata: { ...collection.metadata, seeAlso }
                              });
                            }}
                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            placeholder="https://example.org/data.json"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">タイプ</label>
                            <select
                              value={collection.metadata?.seeAlso?.[0]?.type || 'Dataset'}
                              onChange={(e) => {
                                const currentSeeAlso = collection.metadata?.seeAlso?.[0] || { id: '', format: 'application/json', label: {} };
                                const seeAlso = [{
                                  ...currentSeeAlso,
                                  type: e.target.value
                                }];
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, seeAlso }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                              <option value="Dataset">Dataset</option>
                              <option value="Text">Text</option>
                              <option value="Image">Image</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">フォーマット</label>
                            <input
                              type="text"
                              value={collection.metadata?.seeAlso?.[0]?.format || ''}
                              onChange={(e) => {
                                const currentSeeAlso = collection.metadata?.seeAlso?.[0] || { id: '', type: 'Dataset', label: {} };
                                const seeAlso = [{
                                  ...currentSeeAlso,
                                  format: e.target.value
                                }];
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, seeAlso }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="e.g. application/json"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ラベル</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              value={collection.metadata?.seeAlso?.[0]?.label?.ja?.[0] || ''}
                              onChange={(e) => {
                                const currentSeeAlso = collection.metadata?.seeAlso?.[0] || { id: '', type: 'Dataset', format: 'application/json', label: {} };
                                const seeAlso = [{
                                  ...currentSeeAlso,
                                  label: {
                                    ...currentSeeAlso.label,
                                    ja: e.target.value ? [e.target.value] : []
                                  }
                                }];
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, seeAlso }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="日本語（例: 関連データ）"
                            />
                            <input
                              type="text"
                              value={collection.metadata?.seeAlso?.[0]?.label?.en?.[0] || ''}
                              onChange={(e) => {
                                const currentSeeAlso = collection.metadata?.seeAlso?.[0] || { id: '', type: 'Dataset', format: 'application/json', label: {} };
                                const seeAlso = [{
                                  ...currentSeeAlso,
                                  label: {
                                    ...currentSeeAlso.label,
                                    en: e.target.value ? [e.target.value] : []
                                  }
                                }];
                                setCollection({
                                  ...collection,
                                  metadata: { ...collection.metadata, seeAlso }
                                });
                              }}
                              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                              placeholder="English (e.g. Related Data)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'access' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiUsers />
                  アクセス設定
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={collection.isPublic}
                      onChange={(e) => setCollection({ ...collection, isPublic: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <label htmlFor="isPublic" className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {collection.isPublic ? (
                          <FiGlobe className="text-green-500" />
                        ) : (
                          <FiGlobe className="text-gray-400" />
                        )}
                        このコレクションを公開する
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {collection.isPublic 
                          ? '誰でもこのコレクションを閲覧できます'
                          : 'あなただけがこのコレクションを閲覧できます'}
                      </p>
                    </label>
                  </div>
                  
                  {collection.isPublic && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        公開設定をオンにすると、このコレクションはIIIFエンドポイントを通じて
                        誰でもアクセス可能になります。美術館や図書館のビューワーからも
                        閲覧できるようになります。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}