'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';
import { FiUpload, FiImage, FiLink, FiLayers } from 'react-icons/fi';
import IIIFCollectionImporter from './IIIFCollectionImporter';

interface ImageUploaderProps {
  onUpload: (files: File[]) => void;
  onUrlAdd: (url: string) => void;
  onInfoJsonAdd: (url: string) => void;
  onCollectionImport?: (manifests: Array<{ url: string; label: string; thumbnail?: string }>) => void;
}

export default function ImageUploader({ onUpload, onUrlAdd, onInfoJsonAdd, onCollectionImport }: ImageUploaderProps) {
  const t = useTranslations();
  const [urlInput, setUrlInput] = useState('');
  const [infoJsonInput, setInfoJsonInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'iiif' | 'collection'>('upload');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif'],
    },
    multiple: true,
  });

  const handleUrlAdd = () => {
    if (urlInput.trim()) {
      onUrlAdd(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleInfoJsonAdd = () => {
    if (infoJsonInput.trim()) {
      onInfoJsonAdd(infoJsonInput.trim());
      setInfoJsonInput('');
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-2 text-sm sm:text-base rounded-lg transition-colors ${
            activeTab === 'upload'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FiUpload className="inline mr-2" />
          Upload
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`px-3 py-2 text-sm sm:text-base rounded-lg transition-colors ${
            activeTab === 'url'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FiLink className="inline mr-2" />
          {t('ImageUploader.fromUrl')}
        </button>
        <button
          onClick={() => setActiveTab('iiif')}
          className={`px-3 py-2 text-sm sm:text-base rounded-lg transition-colors ${
            activeTab === 'iiif'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FiImage className="inline mr-2" />
          <span className="hidden sm:inline">IIIF info.json</span>
          <span className="sm:hidden">IIIF</span>
        </button>
        {onCollectionImport && (
          <button
            onClick={() => setActiveTab('collection')}
            className={`px-3 py-2 text-sm sm:text-base rounded-lg transition-colors ${
              activeTab === 'collection'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <FiLayers className="inline mr-2" />
            <span className="hidden sm:inline">IIIF Collection</span>
            <span className="sm:hidden">Collection</span>
          </button>
        )}
      </div>

      {activeTab === 'upload' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          <FiUpload className="mx-auto text-4xl text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-blue-500">{t('ImageUploader.dragDrop')}</p>
          ) : (
            <div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {t('ImageUploader.dragDrop')}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('ImageUploader.supportedFormats')}
              </p>
            </div>
          )}
          {acceptedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selected files: {acceptedFiles.length}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'url' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t('ImageUploader.urlPlaceholder')}
              className="flex-1 px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleUrlAdd}
              disabled={!urlInput.trim()}
              className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t('ImageUploader.add')}
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Add external image URLs directly
          </p>
        </div>
      )}

      {activeTab === 'iiif' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={infoJsonInput}
              onChange={(e) => setInfoJsonInput(e.target.value)}
              placeholder={t('ImageUploader.infoJsonPlaceholder')}
              className="flex-1 px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleInfoJsonAdd}
              disabled={!infoJsonInput.trim()}
              className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t('ImageUploader.add')}
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Add info.json from high-quality image delivery services
          </p>
        </div>
      )}

      {activeTab === 'collection' && onCollectionImport && (
        <IIIFCollectionImporter onImport={onCollectionImport} />
      )}
    </div>
  );
}