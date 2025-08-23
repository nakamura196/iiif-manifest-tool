'use client';

import { useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FiArrowLeft, FiUpload, FiInfo, FiLoader } from 'react-icons/fi';
import Link from 'next/link';
import ImageUploader from '@/components/ImageUploader';

interface NewItemPageProps {
  params: Promise<{
    locale: string;
    collectionId: string;
  }>;
}

interface UploadedImage {
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  mimeType?: string;
  infoJson?: string;
  isIIIF?: boolean;
  iiifBaseUrl?: string;
}

export default function NewItemPage({ params }: NewItemPageProps) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const [creating, setCreating] = useState(false);
  const [creatingMessage, setCreatingMessage] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);

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
      
      const baseUrl = infoJson.id || infoJson['@id'];
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      
      // Full size image URL
      const imageUrl = `${cleanBaseUrl}/full/full/0/default.jpg`;
      
      // Generate thumbnail URL with appropriate size
      let thumbnailUrl = imageUrl; // Default to full size
      if (infoJson.sizes && infoJson.sizes.length > 0) {
        // Find a suitable thumbnail size (around 400px width)
        const thumbnailSize = infoJson.sizes.find((size: {width: number; height: number}) => 
          size.width >= 400 && size.width <= 800
        );
        
        if (thumbnailSize) {
          // Use specific width AND height from sizes array
          thumbnailUrl = `${cleanBaseUrl}/full/${thumbnailSize.width},${thumbnailSize.height}/0/default.jpg`;
        } else {
          // If no suitable size in range, find the largest available size
          // Sort sizes by width to ensure we get the largest
          const sortedSizes = [...infoJson.sizes].sort((a, b) => b.width - a.width);
          const largestSize = sortedSizes[0];
          if (largestSize) {
            thumbnailUrl = `${cleanBaseUrl}/full/${largestSize.width},${largestSize.height}/0/default.jpg`;
          } else {
            // Fallback to a small fixed size
            thumbnailUrl = `${cleanBaseUrl}/full/400,/0/default.jpg`;
          }
        }
      } else if (infoJson.width) {
        // If no sizes array but width is available, calculate proportional thumbnail
        const targetWidth = Math.min(400, infoJson.width);
        thumbnailUrl = `${cleanBaseUrl}/full/${targetWidth},/0/default.jpg`;
      }
      
      setUploadedImages([
        ...uploadedImages,
        {
          url: imageUrl,
          thumbnailUrl: thumbnailUrl,
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

  const handleCreate = async () => {
    if (!title.trim() || uploadedImages.length === 0) return;

    setCreating(true);
    setCreatingMessage('アイテムを作成中...');
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          images: uploadedImages,
          isPublic,
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        setCreatingMessage('作成を確認中...');
        
        // 作成が完了したことを確認するために少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 作成されたことを確認
        const checkResponse = await fetch(`/api/collections/${resolvedParams.collectionId}/items/${newItem.id}`);
        if (checkResponse.ok) {
          setCreatingMessage('編集ページへ移動中...');
          // 作成が確認できたら編集ページへ遷移
          router.push(`/${resolvedParams.locale}/dashboard/collections/${resolvedParams.collectionId}/items/${newItem.id}/edit`);
        } else {
          console.error('Item created but not found immediately');
          setCreatingMessage('もう少しお待ちください...');
          // 少し待ってから遷移
          setTimeout(() => {
            router.push(`/${resolvedParams.locale}/dashboard/collections/${resolvedParams.collectionId}/items/${newItem.id}/edit`);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error creating item:', error);
    } finally {
      setCreating(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/api/auth/signin');
    return null;
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
              <h1 className="text-xl sm:text-2xl font-bold">新しいアイテムを作成</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || uploadedImages.length === 0 || creating || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                {creating ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiUpload />
                )}
                <span className="hidden sm:inline">{creating ? creatingMessage || t('NewItem.creating') : t('NewItem.create')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiInfo className="text-xl text-blue-500" />
              <h2 className="text-lg font-semibold">基本情報</h2>
            </div>

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
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
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
                <label htmlFor="isPublic" className="text-sm">
                  このアイテムを公開する
                </label>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">画像をアップロード *</h2>
            
            {uploadedImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  アップロード済み: {uploadedImages.length}枚
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img.isIIIF && img.iiifBaseUrl ? `${img.iiifBaseUrl}/full/200,/0/default.jpg` : img.url}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
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
            
            {uploading && (
              <div className="mt-4 text-center text-gray-600 dark:text-gray-400">
                アップロード中...
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              アイテムを作成すると、詳細な編集ページに移動します。
              そこで位置情報、メタデータ、アクセス設定などを追加できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}