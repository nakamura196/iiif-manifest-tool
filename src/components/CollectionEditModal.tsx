'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';

interface CollectionEditModalProps {
  collectionId: string;
  onClose: () => void;
  onUpdate: () => void;
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

export default function CollectionEditModal({ collectionId, onClose, onUpdate }: CollectionEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collection, setCollection] = useState<CollectionData>({
    name: '',
    description: '',
    isPublic: true,
    metadata: {}
  });

  const fetchCollection = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${collectionId}`);
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
  }, [collectionId]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collection),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        console.error('Failed to update collection');
      }
    } catch (error) {
      console.error('Error updating collection:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">コレクション設定</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <FiX className="text-xl" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* 基本情報 */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">基本情報</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  コレクション名 *
                </label>
                <input
                  type="text"
                  value={collection.name}
                  onChange={(e) => setCollection({ ...collection, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">説明</label>
                <textarea
                  value={collection.description}
                  onChange={(e) => setCollection({ ...collection, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm sm:text-base"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={collection.isPublic}
                  onChange={(e) => setCollection({ ...collection, isPublic: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm">
                  このコレクションを公開する
                </label>
              </div>
            </div>
          </div>

          {/* カスタム情報 */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">追加情報</h3>
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
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
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
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
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
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
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
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
              >
                <FiPlus />
                情報を追加
              </button>
            </div>
          </div>

          {/* 詳細設定 */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">詳細設定</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  所蔵・提供機関
                </label>
                <input
                  type="text"
                  value={collection.metadata?.attribution || ''}
                  onChange={(e) => setCollection({
                    ...collection,
                    metadata: { ...collection.metadata, attribution: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  placeholder="例: 国立図書館"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  placeholder="例: 〇〇大学図書館"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
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
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                    rows={2}
                    placeholder="説明（例: 画像の二次利用については事前にご相談ください）"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  ライセンス情報
                </label>
                <input
                  type="text"
                  value={collection.metadata?.rights || ''}
                  onChange={(e) => setCollection({
                    ...collection,
                    metadata: { ...collection.metadata, rights: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  placeholder="例: https://creativecommons.org/licenses/by/4.0/"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  placeholder="https://example.org"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  placeholder="https://example.org/data.json"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !collection.name}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}