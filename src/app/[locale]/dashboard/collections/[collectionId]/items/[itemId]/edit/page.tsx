'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiSave, FiTrash2, FiPlus, FiSettings, FiImage, FiMapPin, FiInfo, FiLock } from 'react-icons/fi';
import ImageUploader from '@/components/ImageUploader';
import ImageAccessControl from '@/components/ImageAccessControl';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import for map component to avoid SSR issues
const ItemLocationMap = dynamic(() => import('@/components/ItemLocationMap'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">地図を読み込み中...</div>
});

interface ItemEditPageProps {
  params: Promise<{
    locale: string;
    collectionId: string;
    itemId: string;
  }>;
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

export default function ItemEditPage({ params }: ItemEditPageProps) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState<ImageData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [metadata, setMetadata] = useState<ManifestMetadata>({});
  const [showAccessControl, setShowAccessControl] = useState(false);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'additional' | 'location' | 'settings'>('basic');

  const fetchItem = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items/${resolvedParams.itemId}`);
      if (response.ok) {
        const data = await response.json();
        setTitle(data.title || '');
        setDescription(data.description || '');
        setIsPublic(data.isPublic !== undefined ? data.isPublic : true);
        setImages(data.images || []);
        setMetadata(data.metadata || {});
        if (data.location) {
          setLatitude(data.location.latitude?.toString() || '');
          setLongitude(data.location.longitude?.toString() || '');
          setLocationLabel(data.location.label || '');
        }
      } else {
        console.error('Failed to fetch item:', response.status);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.collectionId, resolvedParams.itemId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItem();
    } else if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, fetchItem, router]);

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
      
      const baseUrl = infoJson.id || infoJson['@id'];
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const imageUrl = `${cleanBaseUrl}/full/full/0/default.jpg`;
      
      setImages([
        ...images,
        {
          url: imageUrl,
          width: infoJson.width,
          height: infoJson.height,
          mimeType: 'image/jpeg',
          infoJson: JSON.stringify(infoJson),
          isIIIF: true,
          iiifBaseUrl: cleanBaseUrl
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
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items/${resolvedParams.itemId}`, {
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
          canvasAccess: images.map(img => img.access || { isPublic: true, allowedUsers: [] }),
          location: (latitude && longitude) ? {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            label: locationLabel || title
          } : undefined
        }),
      });

      if (response.ok) {
        router.push(`/${resolvedParams.locale}/dashboard/collections/${resolvedParams.collectionId}`);
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

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
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
              <h1 className="text-xl sm:text-2xl font-bold">アイテムを編集</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!title || images.length === 0 || saving || uploading}
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
                  onClick={() => setActiveTab('images')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'images'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiImage className="text-lg" />
                  <span>画像管理</span>
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
                  onClick={() => setActiveTab('location')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'location'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiMapPin className="text-lg" />
                  <span>位置情報</span>
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
                      タイトル *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder="アイテムのタイトルを入力"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">説明</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      rows={5}
                      placeholder="アイテムの説明を入力（任意）"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isPublic" className="flex items-center gap-2">
                      {isPublic ? <FiLock className="text-green-500" /> : <FiLock className="text-gray-400" />}
                      このアイテムを公開する
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="space-y-6">
                {/* Current Images */}
                {images.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FiImage />
                      現在の画像 ({images.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.map((img, index) => (
                        <div key={index} className="space-y-2">
                          <div className="relative">
                            <img
                              src={img.isIIIF && img.iiifBaseUrl ? `${img.iiifBaseUrl}/full/400,/0/default.jpg` : img.url}
                              alt={`Image ${index + 1}`}
                              className="w-full h-40 object-cover rounded-lg"
                            />
                            <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                              {index + 1}
                            </div>
                          </div>
                          {/* Controls below image for mobile */}
                          <div className="flex justify-center gap-2">
                            {index > 0 && (
                              <button
                                onClick={() => moveImage(index, 'up')}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                title="前へ移動"
                              >
                                ←
                              </button>
                            )}
                            <button
                              onClick={() => removeImage(index)}
                              className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                              title="削除"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                            {index < images.length - 1 && (
                              <button
                                onClick={() => moveImage(index, 'down')}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                title="次へ移動"
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Uploader */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">新しい画像を追加</h3>
                  <ImageUploader
                    onUpload={handleUpload}
                    onUrlAdd={handleUrlAdd}
                    onInfoJsonAdd={handleInfoJsonAdd}
                  />
                </div>

                {/* Access Control */}
                {!isPublic && images.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
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
              </div>
            )}

            {activeTab === 'additional' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiPlus />
                  追加情報
                </h2>
                <div className="space-y-4">
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
                          className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder="項目名（例: 作成年）"
                        />
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => {
                            const newFields = [...(metadata.customFields || [])];
                            newFields[index].value = e.target.value;
                            setMetadata({ ...metadata, customFields: newFields });
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder="内容（例: 1850年）"
                        />
                        <button
                          onClick={() => {
                            const newFields = metadata.customFields?.filter((_, i) => i !== index) || [];
                            setMetadata({ ...metadata, customFields: newFields });
                          }}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
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
                      情報を追加
                    </button>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ここで追加した情報は、作品の詳細情報として表示されます。
                      作成年、作者、技法、サイズなど、作品に関する様々な情報を自由に追加できます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'location' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiMapPin />
                  位置情報
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">緯度</label>
                      <input
                        type="text"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder="例: 35.6762"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">経度</label>
                      <input
                        type="text"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder="例: 139.6503"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">場所の名前（任意）</label>
                    <input
                      type="text"
                      value={locationLabel}
                      onChange={(e) => setLocationLabel(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder="例: 東京タワー"
                    />
                  </div>
                  {latitude && longitude && (
                    <div className="h-96 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <ItemLocationMap
                        latitude={parseFloat(latitude)}
                        longitude={parseFloat(longitude)}
                        label={locationLabel || title}
                        onChange={handleLocationChange}
                      />
                    </div>
                  )}
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
                  {/* Attribution */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      所蔵・提供機関
                    </label>
                    <input
                      type="text"
                      value={metadata.attribution || ''}
                      onChange={(e) => setMetadata({ ...metadata, attribution: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder="例: 国立図書館"
                    />
                  </div>

                  {/* Rights */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ライセンス情報
                    </label>
                    <input
                      type="text"
                      value={metadata.rights || ''}
                      onChange={(e) => setMetadata({ ...metadata, rights: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder="例: https://creativecommons.org/licenses/by/4.0/"
                    />
                  </div>

                  {/* Required Statement */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      利用条件
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
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder="項目名（例: 利用にあたって）"
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
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        rows={3}
                        placeholder="説明（例: 画像の二次利用については事前にご相談ください）"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}