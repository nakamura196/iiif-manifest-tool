'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiLayers } from 'react-icons/fi';

interface CollectionManifest {
  url: string;
  label: string;
  thumbnail?: string;
}

interface IIIFCollectionImporterProps {
  onImport: (manifests: CollectionManifest[]) => void;
  disabled?: boolean;
}

export default function IIIFCollectionImporter({ onImport, disabled }: IIIFCollectionImporterProps) {
  const t = useTranslations();
  const [collectionUrl, setCollectionUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (!collectionUrl.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/iiif-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: collectionUrl.trim(), type: 'collection' }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }

      const data = await response.json();
      
      if (data.manifests && Array.isArray(data.manifests)) {
        onImport(data.manifests);
        setCollectionUrl('');
      } else {
        throw new Error('Invalid collection format');
      }
    } catch (error) {
      console.error('Error importing collection:', error);
      alert(t('IIIFCollectionImporter.importError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={collectionUrl}
          onChange={(e) => setCollectionUrl(e.target.value)}
          placeholder={t('IIIFCollectionImporter.placeholder')}
          className="flex-1 px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          disabled={isLoading || disabled}
        />
        <button
          onClick={handleImport}
          disabled={!collectionUrl.trim() || isLoading || disabled}
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FiLayers className="text-base" />
          {isLoading ? t('IIIFCollectionImporter.importing') : t('IIIFCollectionImporter.import')}
        </button>
      </div>
      <p className="text-xs sm:text-sm text-gray-500">
        {t('IIIFCollectionImporter.description')}
      </p>
    </div>
  );
}