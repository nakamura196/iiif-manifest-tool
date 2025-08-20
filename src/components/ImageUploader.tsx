'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiImage, FiLink } from 'react-icons/fi';

interface ImageUploaderProps {
  onUpload: (files: File[]) => void;
  onUrlAdd: (url: string) => void;
  onInfoJsonAdd: (url: string) => void;
}

export default function ImageUploader({ onUpload, onUrlAdd, onInfoJsonAdd }: ImageUploaderProps) {
  const [urlInput, setUrlInput] = useState('');
  const [infoJsonInput, setInfoJsonInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'iiif'>('upload');

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
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'upload'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FiUpload className="inline mr-2" />
          アップロード
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'url'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FiLink className="inline mr-2" />
          画像URL
        </button>
        <button
          onClick={() => setActiveTab('iiif')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'iiif'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FiImage className="inline mr-2" />
          IIIF info.json
        </button>
      </div>

      {activeTab === 'upload' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          <FiUpload className="mx-auto text-4xl text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-blue-500">ドロップして画像をアップロード</p>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-400">
                画像をドラッグ&ドロップ、またはクリックして選択
              </p>
              <p className="text-sm text-gray-500 mt-2">
                対応形式: PNG, JPG, JPEG, GIF, WebP, TIFF
              </p>
            </div>
          )}
          {acceptedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                選択されたファイル: {acceptedFiles.length}個
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'url' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="画像のURLを入力"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleUrlAdd}
              disabled={!urlInput.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              追加
            </button>
          </div>
          <p className="text-sm text-gray-500">
            外部の画像URLを直接追加できます
          </p>
        </div>
      )}

      {activeTab === 'iiif' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="url"
              value={infoJsonInput}
              onChange={(e) => setInfoJsonInput(e.target.value)}
              placeholder="IIIF info.jsonのURLを入力"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleInfoJsonAdd}
              disabled={!infoJsonInput.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              追加
            </button>
          </div>
          <p className="text-sm text-gray-500">
            IIIF Image APIのinfo.jsonエンドポイントを追加できます
          </p>
        </div>
      )}
    </div>
  );
}