'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiInfo, FiSettings, FiGlobe, FiUsers } from 'react-icons/fi';
import Link from 'next/link';

interface CollectionEditPageProps {
  params: Promise<{
    locale: string;
    collectionId: string;
  }>;
}

interface CollectionData {
  name: string;
  description: string;
  isPublic: boolean;
  metadata?: {
    attribution?: string;
    requiredStatement?: {
      label: { [key: string]: string[] };
      value: { [key: string]: string[] };
    };
    rights?: string;
    seeAlso?: Array<{
      id: string;
      type: string;
      format?: string;
      label?: { [key: string]: string[] };
    }>;
    homepage?: Array<{
      id: string;
      type: string;
      label?: { [key: string]: string[] };
    }>;
    provider?: Array<{
      id?: string;
      type: string;
      label?: { [key: string]: string[] };
      homepage?: Array<{
        id: string;
        type: string;
        label?: { [key: string]: string[] };
      }>;
    }>;
    customFields?: Array<{
      label: string;
      value: string;
    }>;
  };
}

export default function CollectionEditPage({ params }: CollectionEditPageProps) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collection, setCollection] = useState<CollectionData>({
    name: '',
    description: '',
    isPublic: true,
    metadata: {}
  });
  const [activeTab, setActiveTab] = useState<'basic' | 'metadata' | 'access'>('basic');

  const fetchCollection = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}`);
      if (response.ok) {
        const data = await response.json();
        setCollection({
          name: data.name || '',
          description: data.description || '',
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
                disabled={!collection.name || saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                <FiSave />
                <span className="hidden sm:inline">{saving ? '保存中...' : '保存'}</span>
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
                  onClick={() => setActiveTab('metadata')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'metadata'
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
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      コレクション名 *
                    </label>
                    <input
                      type="text"
                      value={collection.name}
                      onChange={(e) => setCollection({ ...collection, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder="コレクションの名前を入力"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">説明</label>
                    <textarea
                      value={collection.description}
                      onChange={(e) => setCollection({ ...collection, description: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      rows={5}
                      placeholder="コレクションの説明を入力（任意）"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'metadata' && (
              <div className="space-y-6">
                {/* 追加情報 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiSettings />
                    追加情報
                  </h2>
                  <div className="space-y-3">
                    {collection.metadata?.customFields?.map((field, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const newFields = [...(collection.metadata?.customFields || [])];
                            newFields[index].label = e.target.value;
                            setCollection({
                              ...collection,
                              metadata: { ...collection.metadata, customFields: newFields }
                            });
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder="項目名（例: 所蔵番号）"
                        />
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => {
                            const newFields = [...(collection.metadata?.customFields || [])];
                            newFields[index].value = e.target.value;
                            setCollection({
                              ...collection,
                              metadata: { ...collection.metadata, customFields: newFields }
                            });
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder="内容（例: ABC-123）"
                        />
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
                    ))}
                    <button
                      onClick={() => {
                        const newFields = [...(collection.metadata?.customFields || []), { label: '', value: '' }];
                        setCollection({
                          ...collection,
                          metadata: { ...collection.metadata, customFields: newFields }
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                    >
                      <FiPlus />
                      情報を追加
                    </button>
                  </div>
                </div>

                {/* 詳細設定 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">詳細設定</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        所蔵・提供機関
                      </label>
                      <input
                        type="text"
                        value={collection.metadata?.attribution || ''}
                        onChange={(e) => setCollection({
                          ...collection,
                          metadata: { ...collection.metadata, attribution: e.target.value }
                        })}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder="例: 国立図書館"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        提供者名
                      </label>
                      <input
                        type="text"
                        value={collection.metadata?.provider?.[0]?.label?.ja?.[0] || ''}
                        onChange={(e) => {
                          const provider = e.target.value ? [{
                            type: 'Agent',
                            label: { ja: [e.target.value] }
                          }] : undefined;
                          setCollection({
                            ...collection,
                            metadata: { ...collection.metadata, provider }
                          });
                        }}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder="例: 〇〇大学図書館"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        利用条件
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={collection.metadata?.requiredStatement?.label?.ja?.[0] || ''}
                          onChange={(e) => {
                            const currentStatement = collection.metadata?.requiredStatement || {
                              label: { ja: [] },
                              value: { ja: [] }
                            };
                            setCollection({
                              ...collection,
                              metadata: {
                                ...collection.metadata,
                                requiredStatement: {
                                  ...currentStatement,
                                  label: { ja: [e.target.value] }
                                }
                              }
                            });
                          }}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder="項目名（例: 利用にあたって）"
                        />
                        <textarea
                          value={collection.metadata?.requiredStatement?.value?.ja?.[0] || ''}
                          onChange={(e) => {
                            const currentStatement = collection.metadata?.requiredStatement || {
                              label: { ja: [] },
                              value: { ja: [] }
                            };
                            setCollection({
                              ...collection,
                              metadata: {
                                ...collection.metadata,
                                requiredStatement: {
                                  ...currentStatement,
                                  value: { ja: [e.target.value] }
                                }
                              }
                            });
                          }}
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          rows={3}
                          placeholder="説明（例: 画像の二次利用については事前にご相談ください）"
                        />
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
                      <input
                        type="url"
                        value={collection.metadata?.homepage?.[0]?.id || ''}
                        onChange={(e) => {
                          const homepage = e.target.value ? [{
                            id: e.target.value,
                            type: 'Text',
                            label: { ja: ['ホームページ'] }
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
                      <label className="block text-sm font-medium mb-2">
                        関連資料URL
                      </label>
                      <input
                        type="url"
                        value={collection.metadata?.seeAlso?.[0]?.id || ''}
                        onChange={(e) => {
                          const seeAlso = e.target.value ? [{
                            id: e.target.value,
                            type: 'Dataset',
                            format: 'application/json',
                            label: { ja: ['関連データ'] }
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