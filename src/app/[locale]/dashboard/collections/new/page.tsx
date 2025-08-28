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

  const handleCollectionImport = (
    manifests: Array<{ url: string; label: string; thumbnail?: string }>, 
    collectionLabel?: string,
    collectionLabelMultilingual?: unknown
  ) => {
    setImportedManifests(manifests);
    
    // Set the collection name if not already set
    if (!nameJa.trim() || !nameEn.trim()) {
      // If we have multilingual labels, use them
      if (collectionLabelMultilingual && typeof collectionLabelMultilingual === 'object') {
        const labelObj = collectionLabelMultilingual as Record<string, unknown>;
        if (!nameJa.trim() && labelObj.ja && Array.isArray(labelObj.ja) && labelObj.ja[0]) {
          setNameJa(String(labelObj.ja[0]));
        }
        if (!nameEn.trim() && labelObj.en && Array.isArray(labelObj.en) && labelObj.en[0]) {
          setNameEn(String(labelObj.en[0]));
        }
        // If only one language is available, use it for both
        if (!nameJa.trim() && !labelObj.ja) {
          setNameJa(collectionLabel || 'Imported Collection');
        }
        if (!nameEn.trim() && !labelObj.en) {
          setNameEn(collectionLabel || 'Imported Collection');
        }
      } else {
        // Fall back to simple string label
        const name = collectionLabel || (manifests.length > 0 ? manifests[0].label.split(' - ')[0] : 'Imported Collection');
        if (!nameJa.trim()) setNameJa(name);
        if (!nameEn.trim()) setNameEn(name);
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
                
                // Extract multilingual title from manifest
                let titleJa = '';
                let titleEn = '';
                if (manifestData.label) {
                  if (typeof manifestData.label === 'string') {
                    titleJa = manifestData.label;
                    titleEn = manifestData.label;
                  } else if (manifestData.label && typeof manifestData.label === 'object') {
                    titleJa = manifestData.label.ja?.[0] || manifestData.label.none?.[0] || manifest.label;
                    titleEn = manifestData.label.en?.[0] || manifestData.label.none?.[0] || manifest.label;
                  }
                }
                
                // Extract multilingual summaries - handle multiple lines
                let descriptionJa: string[] = [];
                let descriptionEn: string[] = [];
                if (manifestData.summary) {
                  const summary = manifestData.summary;
                  if (typeof summary === 'string') {
                    descriptionJa = [summary];
                    descriptionEn = [summary];
                  } else if (summary && typeof summary === 'object') {
                    // Get all Japanese summary lines
                    if (summary.ja && Array.isArray(summary.ja)) {
                      descriptionJa = summary.ja;
                    }
                    // Get all English summary lines
                    if (summary.en && Array.isArray(summary.en)) {
                      descriptionEn = summary.en;
                    }
                    // Get 'none' language if others don't exist
                    if (descriptionJa.length === 0 && summary.none && Array.isArray(summary.none)) {
                      descriptionJa = summary.none;
                    }
                    if (descriptionEn.length === 0 && summary.none && Array.isArray(summary.none)) {
                      descriptionEn = summary.none;
                    }
                  }
                }
                
                // Extract multilingual metadata - preserve all languages
                let customFields: Array<{ label: { [key: string]: string[] }; value: { [key: string]: string[] } }> = [];
                let license = '';
                
                // Extract metadata (v3 format with language maps) - preserve multilingual format
                if (manifestData.metadata && Array.isArray(manifestData.metadata)) {
                  customFields = manifestData.metadata.map((item: unknown) => {
                    // Preserve the full multilingual structure
                    const field: { label: { [key: string]: string[] }; value: { [key: string]: string[] } } = {
                      label: {},
                      value: {}
                    };
                    
                    const itemObj = item as Record<string, unknown>;
                    // Extract label - preserve all languages
                    if (itemObj.label) {
                      if (typeof itemObj.label === 'string') {
                        field.label = { ja: [itemObj.label], en: [itemObj.label] };
                      } else if (typeof itemObj.label === 'object') {
                        field.label = itemObj.label as { [key: string]: string[] };
                      }
                    }
                    
                    // Extract value - preserve all languages and multiple values
                    if (itemObj.value) {
                      if (typeof itemObj.value === 'string') {
                        field.value = { ja: [itemObj.value], en: [itemObj.value] };
                      } else if (typeof itemObj.value === 'object') {
                        field.value = itemObj.value as { [key: string]: string[] };
                      }
                    }
                    
                    return field;
                  }).filter((item: { label: { [key: string]: string[] }; value: { [key: string]: string[] } }) => {
                    // Check if field has any content
                    const hasLabel = Object.keys(item.label).some(lang => item.label[lang]?.length > 0);
                    const hasValue = Object.keys(item.value).some(lang => item.value[lang]?.length > 0);
                    return hasLabel && hasValue;
                  });
                }
                
                // Extract required statement, provider, homepage, seeAlso - preserve multilingual format
                const requiredStatement = manifestData.requiredStatement;
                
                // Fix requiredStatement label if it only has "none" language
                if (requiredStatement && requiredStatement.label) {
                  if (requiredStatement.label.none && !requiredStatement.label.ja && !requiredStatement.label.en) {
                    // Add Japanese and English translations for common attribution labels
                    const noneLabel = requiredStatement.label.none[0];
                    if (noneLabel === 'Attribution' || noneLabel === 'Required Statement') {
                      requiredStatement.label.ja = ['帰属'];
                      requiredStatement.label.en = ['Attribution'];
                    } else {
                      // Use the none value for both languages as fallback
                      requiredStatement.label.ja = requiredStatement.label.none;
                      requiredStatement.label.en = requiredStatement.label.none;
                    }
                  }
                }
                
                const provider = manifestData.provider;
                const homepage = manifestData.homepage;
                const seeAlso = manifestData.seeAlso;
                
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
                  // Build IIIF v3 format label and summary
                  const label: { [key: string]: string[] } = {};
                  const summary: { [key: string]: string[] } = {};
                  
                  if (titleJa) label.ja = [titleJa];
                  if (titleEn) label.en = [titleEn];
                  if (!titleJa && !titleEn) label.none = [manifest.label];
                  
                  if (descriptionJa.length > 0) summary.ja = descriptionJa;
                  if (descriptionEn.length > 0) summary.en = descriptionEn;
                  
                  const itemData = {
                    label,  // IIIF v3 format: { [lang]: string[] }
                    summary,  // IIIF v3 format: { [lang]: string[] }
                    images,
                    isPublic,
                    metadata: {
                      rights: license,
                      requiredStatement,
                      provider,
                      homepage,
                      seeAlso,
                      customFields: customFields.length > 0 ? customFields : undefined
                    }
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