'use client';

import { useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FiArrowLeft, FiSave, FiInfo, FiLoader, FiLayers } from 'react-icons/fi';
import Link from 'next/link';
import IIIFCollectionImporter from '@/components/IIIFCollectionImporter';

interface NewCollectionPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default function NewCollectionPage({ params }: NewCollectionPageProps) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  const [creating, setCreating] = useState(false);
  const [creatingMessage, setCreatingMessage] = useState('');
  const [nameJa, setNameJa] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionJa, setDescriptionJa] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [importMode, setImportMode] = useState<'manual' | 'iiif'>('manual');
  const [importedManifests, setImportedManifests] = useState<Array<{ url: string; label: string; thumbnail?: string }>>();

  const handleCollectionImport = (manifests: Array<{ url: string; label: string; thumbnail?: string }>) => {
    setImportedManifests(manifests);
    if (!nameJa.trim() && manifests.length > 0) {
      // Extract collection name from the first manifest label if name is empty
      const collectionName = manifests[0].label.split(' - ')[0] || 'Imported Collection';
      setNameJa(collectionName);
      // Set English name to the same value initially (user can edit later)
      if (!nameEn.trim()) {
        setNameEn(collectionName);
      }
    }
  };

  const handleCreate = async () => {
    if (!nameJa.trim() && !nameEn.trim()) return;

    setCreating(true);
    setCreatingMessage('コレクションを作成中...');
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nameJa,
          nameEn,
          descriptionJa,
          descriptionEn,
          isPublic,
        }),
      });

      if (response.ok) {
        const collection = await response.json();
        
        // If we have imported manifests, create items for them
        if (importedManifests && importedManifests.length > 0) {
          setCreatingMessage(`${importedManifests.length}個のアイテムをインポート中...`);
          
          let successCount = 0;
          for (const manifest of importedManifests) {
            try {
              // Fetch manifest data
              const manifestResponse = await fetch('/api/iiif-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: manifest.url, type: 'manifest' }),
              });

              if (manifestResponse.ok) {
                const manifestData = await manifestResponse.json();
                const images = [];
                let description = '';
                let metadata = [];
                let attribution = '';
                let license = '';
                
                // Extract description from v3 format (summary field)
                if (manifestData.summary) {
                  const summary = manifestData.summary;
                  if (typeof summary === 'string') {
                    description = summary;
                  } else if (summary && typeof summary === 'object') {
                    // Try Japanese first, then English, then any language
                    if (summary.ja && summary.ja[0]) {
                      description = summary.ja[0];
                    } else if (summary.en && summary.en[0]) {
                      description = summary.en[0];
                    } else if (summary.none && summary.none[0]) {
                      description = summary.none[0];
                    } else {
                      const firstLang = Object.keys(summary)[0];
                      if (firstLang && Array.isArray(summary[firstLang])) {
                        description = summary[firstLang][0] || '';
                      }
                    }
                  }
                }
                
                // Extract metadata (v3 format with language maps)
                if (manifestData.metadata && Array.isArray(manifestData.metadata)) {
                  metadata = manifestData.metadata.map((item: any) => {
                    let label = '';
                    let value = '';
                    
                    // Extract label from language map
                    if (item.label) {
                      if (typeof item.label === 'string') {
                        label = item.label;
                      } else if (item.label.ja && item.label.ja[0]) {
                        label = item.label.ja[0];
                      } else if (item.label.en && item.label.en[0]) {
                        label = item.label.en[0];
                      } else if (item.label.none && item.label.none[0]) {
                        label = item.label.none[0];
                      } else {
                        const firstLang = Object.keys(item.label)[0];
                        if (firstLang && Array.isArray(item.label[firstLang])) {
                          label = item.label[firstLang][0] || '';
                        }
                      }
                    }
                    
                    // Extract value from language map
                    if (item.value) {
                      if (typeof item.value === 'string') {
                        value = item.value;
                      } else if (item.value.ja && item.value.ja[0]) {
                        value = item.value.ja[0];
                      } else if (item.value.en && item.value.en[0]) {
                        value = item.value.en[0];
                      } else if (item.value.none && item.value.none[0]) {
                        value = item.value.none[0];
                      } else {
                        const firstLang = Object.keys(item.value)[0];
                        if (firstLang && Array.isArray(item.value[firstLang])) {
                          value = item.value[firstLang][0] || '';
                        }
                      }
                    }
                    
                    return { label, value };
                  }).filter((item: any) => item.label && item.value);
                }
                
                // Extract required statement (attribution in v3)
                if (manifestData.requiredStatement) {
                  const reqStatement = manifestData.requiredStatement;
                  if (reqStatement.value) {
                    if (typeof reqStatement.value === 'string') {
                      attribution = reqStatement.value;
                    } else if (reqStatement.value.ja && reqStatement.value.ja[0]) {
                      attribution = reqStatement.value.ja[0];
                    } else if (reqStatement.value.en && reqStatement.value.en[0]) {
                      attribution = reqStatement.value.en[0];
                    } else if (reqStatement.value.none && reqStatement.value.none[0]) {
                      attribution = reqStatement.value.none[0];
                    } else {
                      const firstLang = Object.keys(reqStatement.value)[0];
                      if (firstLang && Array.isArray(reqStatement.value[firstLang])) {
                        attribution = reqStatement.value[firstLang][0] || '';
                      }
                    }
                  }
                }
                
                // Extract rights (license in v3)
                if (manifestData.rights) {
                  license = typeof manifestData.rights === 'string' ? manifestData.rights : '';
                }
                
                // Extract images from v3 format only (since we convert everything to v3)
                if (manifestData.items?.[0]) {
                  const canvas = manifestData.items[0];
                  const annotationPage = canvas.items?.[0];
                  const annotation = annotationPage?.items?.[0];
                  const body = annotation?.body;
                  const imageBody = Array.isArray(body) ? body[0] : body;
                  
                  if (imageBody) {
                    images.push({
                      url: imageBody.id || imageBody['@id'],
                      thumbnailUrl: manifest.thumbnail,
                      width: canvas.width || imageBody.width || 1000,
                      height: canvas.height || imageBody.height || 1000,
                      mimeType: imageBody.format || imageBody.type || 'image/jpeg',
                    });
                  }
                }
                
                // Create item if we have images
                if (images.length > 0) {
                  const itemData = {
                    title: manifest.label,
                    description: description || '',
                    images,
                    isPublic,
                    attribution,
                    license,
                    metadata: metadata.length > 0 ? JSON.stringify(metadata) : undefined,
                  };
                  
                  const itemResponse = await fetch(`/api/collections/${collection.id}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemData),
                  });
                  
                  if (itemResponse.ok) {
                    successCount++;
                    setCreatingMessage(`インポート中... (${successCount}/${importedManifests.length})`);
                  }
                }
              }
            } catch (error) {
              console.error(`Failed to import manifest: ${manifest.url}`, error);
            }
          }
          
          if (successCount > 0) {
            setCreatingMessage(`${successCount}個のアイテムをインポートしました`);
          }
        }
        
        setCreatingMessage('ページへ移動中...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push(`/${resolvedParams.locale}/dashboard/collections/${collection.id}`);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('コレクションの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('Common.loading')}</div>
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
                href={`/${resolvedParams.locale}/dashboard`}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiArrowLeft className="text-xl" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">{t('NewCollection.title')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={(!nameJa.trim() && !nameEn.trim()) || creating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                {creating ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiSave />
                )}
                <span className="hidden sm:inline">{creating ? creatingMessage || t('NewCollection.creating') : t('NewCollection.create')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <FiInfo className="text-xl text-blue-500" />
              <h2 className="text-lg font-semibold">{t('NewCollection.basicInfo')}</h2>
            </div>

            <div className="space-y-4">
              {/* Japanese Fields */}
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">🇯🇵</span>
                  {t('NewCollection.japaneseInfo')}
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('NewCollection.collectionNameJa')} *
                  </label>
                  <input
                    type="text"
                    value={nameJa}
                    onChange={(e) => setNameJa(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder={t('NewCollection.collectionNameJaPlaceholder')}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('NewCollection.descriptionJa')}
                  </label>
                  <textarea
                    value={descriptionJa}
                    onChange={(e) => setDescriptionJa(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                    placeholder={t('NewCollection.descriptionJaPlaceholder')}
                  />
                </div>
              </div>

              {/* English Fields */}
              <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">🇬🇧</span>
                  {t('NewCollection.englishInfo')}
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('NewCollection.collectionNameEn')}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder={t('NewCollection.collectionNameEnPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('NewCollection.descriptionEn')}
                  </label>
                  <textarea
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                    placeholder={t('NewCollection.descriptionEnPlaceholder')}
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isPublic" className="flex-1">
                    <div className="font-medium">{t('NewCollection.makePublic')}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {isPublic 
                        ? t('CollectionEdit.publicNote')
                        : t('CollectionEdit.privateNote')}
                    </p>
                  </label>
                </div>
              </div>

              {isPublic && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {t('NewCollection.publicNote')}
                  </p>
                </div>
              )}
              
              {/* Import Mode Selection */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">{t('NewCollection.importMode')}</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="manual"
                      checked={importMode === 'manual'}
                      onChange={(e) => setImportMode(e.target.value as 'manual' | 'iiif')}
                      className="text-blue-500"
                    />
                    <span className="text-sm">{t('NewCollection.manualMode')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="iiif"
                      checked={importMode === 'iiif'}
                      onChange={(e) => setImportMode(e.target.value as 'manual' | 'iiif')}
                      className="text-blue-500"
                    />
                    <span className="text-sm flex items-center gap-1">
                      <FiLayers className="text-xs" />
                      {t('NewCollection.iiifImportMode')}
                    </span>
                  </label>
                </div>
              </div>
              
              {/* IIIF Collection Import */}
              {importMode === 'iiif' && (
                <div className="mt-4">
                  <IIIFCollectionImporter onImport={handleCollectionImport} />
                  {importedManifests && importedManifests.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        {importedManifests.length}個のアイテムをインポート準備完了
                      </p>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {importedManifests.slice(0, 5).map((manifest, index) => (
                          <div key={index} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            • {manifest.label}
                          </div>
                        ))}
                        {importedManifests.length > 5 && (
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            ... 他 {importedManifests.length - 5} 件
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}