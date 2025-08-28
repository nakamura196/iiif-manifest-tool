'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiArrowRight, FiCopy, FiCheck, FiDownload, FiLink, FiFile } from 'react-icons/fi';
import Link from 'next/link';

export default function IIIFParserPage() {
  const t = useTranslations();
  const [inputType, setInputType] = useState<'url' | 'json'>('url');
  const [inputUrl, setInputUrl] = useState('');
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseInfo, setParseInfo] = useState<{
    inputVersion?: string;
    outputVersion?: string;
    type?: string;
    itemCount?: number;
  }>({});

  const handleParse = async () => {
    setIsLoading(true);
    setError('');
    setOutputJson('');
    setParseInfo({});

    try {
      const response = await fetch('/api/tools/iiif-parser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: inputType,
          url: inputType === 'url' ? inputUrl : undefined,
          json: inputType === 'json' ? inputJson : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse IIIF resource');
      }

      setOutputJson(JSON.stringify(data.parsed, null, 2));
      setParseInfo(data.info || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([outputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iiif-v3-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadExample = () => {
    if (inputType === 'url') {
      setInputUrl('https://api.cultural.jp/iiif/metmuseum-56965/manifest');
    } else {
      setInputJson(`{
  "@context": "http://iiif.io/api/presentation/2/context.json",
  "@id": "https://example.org/manifest",
  "@type": "sc:Manifest",
  "label": "Example Manifest",
  "sequences": [
    {
      "@type": "sc:Sequence",
      "canvases": [
        {
          "@id": "https://example.org/canvas/1",
          "@type": "sc:Canvas",
          "label": "Canvas 1",
          "height": 1000,
          "width": 1000,
          "images": [
            {
              "@type": "oa:Annotation",
              "motivation": "sc:painting",
              "resource": {
                "@id": "https://example.org/image.jpg",
                "@type": "dctypes:Image",
                "format": "image/jpeg",
                "height": 1000,
                "width": 1000
              },
              "on": "https://example.org/canvas/1"
            }
          ]
        }
      ]
    }
  ]
}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/ja/dashboard" className="text-blue-500 hover:underline mb-4 inline-block">
          ← {t('Common.back')}
        </Link>
        <h1 className="text-3xl font-bold mb-4">{t('IIIFParser.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('IIIFParser.description')}
        </p>
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ {t('IIIFParser.experimentalNote')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-3">{t('IIIFParser.input')}</h2>
            
            {/* Input Type Selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setInputType('url')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  inputType === 'url'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <FiLink />
                {t('IIIFParser.fromUrl')}
              </button>
              <button
                onClick={() => setInputType('json')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  inputType === 'json'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <FiFile />
                {t('IIIFParser.fromJson')}
              </button>
              <button
                onClick={loadExample}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ml-auto"
              >
                {t('IIIFParser.loadExample')}
              </button>
            </div>

            {/* Input Field */}
            {inputType === 'url' ? (
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder={t('IIIFParser.urlPlaceholder')}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            ) : (
              <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder={t('IIIFParser.jsonPlaceholder')}
                className="w-full h-96 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
              />
            )}

            {/* Parse Button */}
            <button
              onClick={handleParse}
              disabled={isLoading || (inputType === 'url' ? !inputUrl : !inputJson)}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>{t('IIIFParser.parsing')}</>
              ) : (
                <>
                  {t('IIIFParser.parse')}
                  <FiArrowRight />
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('IIIFParser.output')} (IIIF v3)</h2>
            {outputJson && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-1"
                >
                  {copied ? <FiCheck /> : <FiCopy />}
                  {copied ? t('IIIFParser.copied') : t('IIIFParser.copy')}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-1"
                >
                  <FiDownload />
                  {t('IIIFParser.download')}
                </button>
              </div>
            )}
          </div>

          {/* Parse Info */}
          {parseInfo.inputVersion && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">{t('IIIFParser.inputVersion')}:</span>
                <span>{parseInfo.inputVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">{t('IIIFParser.outputVersion')}:</span>
                <span>{parseInfo.outputVersion}</span>
              </div>
              {parseInfo.type && (
                <div className="flex justify-between">
                  <span className="font-semibold">{t('IIIFParser.resourceType')}:</span>
                  <span>{parseInfo.type}</span>
                </div>
              )}
              {parseInfo.itemCount !== undefined && (
                <div className="flex justify-between">
                  <span className="font-semibold">{t('IIIFParser.itemCount')}:</span>
                  <span>{parseInfo.itemCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Output JSON */}
          {outputJson ? (
            <textarea
              value={outputJson}
              readOnly
              className="w-full h-96 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
            />
          ) : (
            <div className="w-full h-96 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 flex items-center justify-center text-gray-400">
              {t('IIIFParser.outputPlaceholder')}
            </div>
          )}
        </div>
      </div>

      {/* Documentation Section */}
      <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">{t('IIIFParser.about')}</h3>
        <div className="prose dark:prose-invert max-w-none text-sm">
          <p>{t('IIIFParser.aboutDescription')}</p>
          <ul className="mt-3">
            <li>{t('IIIFParser.feature1')}</li>
            <li>{t('IIIFParser.feature2')}</li>
            <li>{t('IIIFParser.feature3')}</li>
            <li>{t('IIIFParser.feature4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}