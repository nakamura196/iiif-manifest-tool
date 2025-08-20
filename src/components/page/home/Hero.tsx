import { FaArrowRight } from 'react-icons/fa';
import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
// import { getLocale } from 'next-intl/server';
// import { getNode } from '@/lib/api/drupal/queries';

export default async function Hero() {
  const t = await getTranslations('HomePage');
  const tCommon = await getTranslations('Common');
  // const locale = await getLocale();

  /*
  const node = await getNode('page', 'a13c1495-9d45-4439-a8c2-e93d4fdc32f4', locale);

  if (!node) {
    return null;
  }

  const description = node.attributes.body.value;
  */

  // const description = 'test';

  return (
    <section className="relative">
      {/* 背景画像 */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-black/70 dark:bg-black/80" />
      </div>

      {/* コンテンツ */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">{tCommon('title')}</h1>
            <div className="text-lg md:text-xl mb-8 text-white/90 dark:text-white/80 prose dark:prose-invert">
              {tCommon('description')}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/about"
                className="inline-flex items-center justify-center bg-white dark:bg-white/90 text-blue-600 dark:text-blue-500 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-white transition-colors w-full sm:w-auto"
              >
                {t('hero.cta')}
                <FaArrowRight className="ml-2" />
              </Link>

              <Link
                href="/example"
                className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full sm:w-auto"
              >
                {t('hero.secondary')}
                <FaArrowRight className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
