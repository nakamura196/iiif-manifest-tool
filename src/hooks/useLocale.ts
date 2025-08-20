'use client';

import { useLocale as useNextIntlLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { routing } from '@/i18n/routing';

export function useLocale() {
  const locale = useNextIntlLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    router.push(newPath);
  };

  const isCurrentLocale = (checkLocale: string) => locale === checkLocale;

  return {
    locale,
    locales: routing.locales,
    switchLocale,
    isCurrentLocale,
  };
}