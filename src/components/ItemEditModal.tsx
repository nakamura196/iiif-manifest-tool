'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiX, FiTrash2, FiEdit2, FiSettings, FiPlus } from 'react-icons/fi';
import ImageUploader from './ImageUploader';
import ImageAccessControl from './ImageAccessControl';

interface ItemEditModalProps {
  itemId: string;
  collectionId: string;
  ownerId?: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface MetadataField {
  label: string;
  value: string;
}

interface ManifestMetadata {
  attribution?: string;
  rights?: string;
  requiredStatement?: {
    label: { [key: string]: string[] };
    value: { [key: string]: string[] };
  };
  homepage?: Array<{
    id: string;
    type: string;
    label?: { [key: string]: string[] };
  }>;
  seeAlso?: Array<{
    id: string;
    type: string;
    format?: string;
    label?: { [key: string]: string[] };
  }>;
  provider?: Array<{
    id?: string;
    type: string;
    label?: { [key: string]: string[] };
  }>;
  customFields?: MetadataField[];
}

export default function ItemEditModal({ itemId, collectionId, ownerId, onClose, onUpdate }: ItemEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  interface ImageData {
    url: string;
    width: number;
    height: number;
    mimeType?: string;
    infoJson?: string;
    isIIIF?: boolean;
    iiifBaseUrl?: string;
    access?: {
      isPublic: boolean;
      allowedUsers: string[];
    };
  }
  
  const [images, setImages] = useState<ImageData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAccessControl, setShowAccessControl] = useState(false);
  const [metadata, setMetadata] = useState<ManifestMetadata>({});

  const fetchItem = useCallback(async () => {
    try {
      const url = ownerId 
        ? `/api/collections/${collectionId}/items/${itemId}?ownerId=${ownerId}`
        : `/api/collections/${collectionId}/items/${itemId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched item data:', data); // Debug log
        setTitle(data.title || '');
        setDescription(data.description || '');
        setIsPublic(data.isPublic !== undefined ? data.isPublic : true);
        setImages(data.images || []);
        setMetadata(data.metadata || {});
      } else {
        console.error('Failed to fetch item:', response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  }, [itemId, collectionId, ownerId]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

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
      setImages([...images, ...results]);
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
        setImages([
          ...images,
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
      
      setImages([
        ...images,
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

  const handleImageAccessChange = (index: number, access: { isPublic: boolean; allowedUsers: string[] }) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], access };
    setImages(newImages);
  };

  const handleSave = async () => {
    if (!title || images.length === 0) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          images,
          isPublic,
          metadata,
          canvasAccess: images.map(img => img.access || { isPublic: true, allowedUsers: [] })
        }),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < images.length) {
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      setImages(newImages);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FiEdit2 />
            アイテムを編集
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              タイトル *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="アイテムのタイトル"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              rows={3}
              placeholder="アイテムの説明（任意）"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="editIsPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="editIsPublic" className="text-sm">
              このアイテムを公開する
            </label>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">画像管理</h3>
          
          {images.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">現在の画像 ({images.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.isIIIF && img.iiifBaseUrl ? `${img.iiifBaseUrl}/full/400,/0/default.jpg` : img.url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {index > 0 && (
                        <button
                          onClick={() => moveImage(index, 'up')}
                          className="p-1 bg-white text-black rounded hover:bg-gray-200"
                          title="前へ移動"
                        >
                          ←
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button
                          onClick={() => moveImage(index, 'down')}
                          className="p-1 bg-white text-black rounded hover:bg-gray-200"
                          title="次へ移動"
                        >
                          →
                        </button>
                      )}
                      <button
                        onClick={() => removeImage(index)}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                        title="削除"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ImageUploader
            onUpload={handleUpload}
            onUrlAdd={handleUrlAdd}
            onInfoJsonAdd={handleInfoJsonAdd}
          />
        </div>

        {!isPublic && images.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowAccessControl(!showAccessControl)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800"
            >
              <FiSettings />
              画像ごとのアクセス設定
            </button>
            
            {showAccessControl && (
              <div className="mt-4">
                <ImageAccessControl
                  images={images}
                  onChange={handleImageAccessChange}
                />
              </div>
            )}
          </div>
        )}

        {/* IIIFメタデータ */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">IIIFメタデータ</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                帰属表示 (Attribution)
              </label>
              <input
                type="text"
                value={metadata.attribution || ''}
                onChange={(e) => setMetadata({ ...metadata, attribution: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="例: 国立図書館所蔵"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                権利情報 (Rights)
              </label>
              <input
                type="text"
                value={metadata.rights || ''}
                onChange={(e) => setMetadata({ ...metadata, rights: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="例: https://creativecommons.org/licenses/by/4.0/"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                必須記載事項 (Required Statement)
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={metadata.requiredStatement?.label?.ja?.[0] || ''}
                  onChange={(e) => {
                    const currentStatement = metadata.requiredStatement || {
                      label: { ja: [] },
                      value: { ja: [] }
                    };
                    setMetadata({
                      ...metadata,
                      requiredStatement: {
                        ...currentStatement,
                        label: { ja: [e.target.value] }
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="ラベル（例: 利用条件）"
                />
                <textarea
                  value={metadata.requiredStatement?.value?.ja?.[0] || ''}
                  onChange={(e) => {
                    const currentStatement = metadata.requiredStatement || {
                      label: { ja: [] },
                      value: { ja: [] }
                    };
                    setMetadata({
                      ...metadata,
                      requiredStatement: {
                        ...currentStatement,
                        value: { ja: [e.target.value] }
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  rows={2}
                  placeholder="値（例: このアイテムの利用にあたっては、所蔵機関の利用規程に従ってください。）"
                />
              </div>
            </div>

            {/* カスタムメタデータフィールド */}
            <div>
              <h4 className="text-sm font-medium mb-2">カスタムメタデータ</h4>
              <div className="space-y-3">
                {metadata.customFields?.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => {
                        const newFields = [...(metadata.customFields || [])];
                        newFields[index].label = e.target.value;
                        setMetadata({ ...metadata, customFields: newFields });
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder="ラベル（例: 作成年）"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...(metadata.customFields || [])];
                        newFields[index].value = e.target.value;
                        setMetadata({ ...metadata, customFields: newFields });
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder="値（例: 1850年）"
                    />
                    <button
                      onClick={() => {
                        const newFields = metadata.customFields?.filter((_, i) => i !== index) || [];
                        setMetadata({ ...metadata, customFields: newFields });
                      }}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newFields = [...(metadata.customFields || []), { label: '', value: '' }];
                    setMetadata({ ...metadata, customFields: newFields });
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                >
                  <FiPlus />
                  メタデータフィールドを追加
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!title || images.length === 0 || saving || uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}