'use client';

import { useLocale } from 'next-intl';
import { SITE_CONFIG } from '@/constants/metadata';

export default function Footer() {
  const locale = useLocale() as 'ja' | 'en';
  const siteName = SITE_CONFIG.name[locale];
  
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">© 2025 {siteName}</p>
        </div>
      </div>
    </footer>
  );
}