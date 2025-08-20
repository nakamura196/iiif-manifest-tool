'use client';

import { useTranslations } from 'next-intl';

export default function ExampleContent() {
  const t = useTranslations('Example');

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {t('feature1.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('feature1.description')}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {t('feature2.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('feature2.description')}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {t('feature3.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('feature3.description')}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          {t('feature4.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('feature4.description')}
        </p>
      </div>
    </div>
  );
}