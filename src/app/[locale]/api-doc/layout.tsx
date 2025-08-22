import { setRequestLocale } from 'next-intl/server';
import { getPageMetadata } from '@/constants/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as 'ja' | 'en';
  return getPageMetadata(locale, {
    title: 'API Documentation',
    description: 'API documentation for the Image Collection Manager',
  });
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ApiDocLayout({ children, params }: LayoutProps) {
  const locale = (await params).locale;
  
  // SSR対応
  setRequestLocale(locale);

  return <>{children}</>;
}