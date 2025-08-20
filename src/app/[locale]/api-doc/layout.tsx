import { setRequestLocale } from 'next-intl/server';

export const metadata = {
  title: 'API Documentation - IIIF Manifest Tool',
  description: 'API documentation for IIIF Manifest Tool',
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