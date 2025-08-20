import { routing } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import PageLayout from '@/components/layout/PageLayout';
import ExampleContent from '@/components/page/example/ExampleContent';

// SSR対応
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ExamplePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations('Example');
  const breadcrumbItems = [{ title: t('title') }];

  return (
    <PageLayout 
      breadcrumbItems={breadcrumbItems} 
      title={t('title')}
      description={t('description')}
    >
      <ExampleContent />
    </PageLayout>
  );
}