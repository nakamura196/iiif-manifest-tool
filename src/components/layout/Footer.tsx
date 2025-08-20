import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
// import { getLocale } from 'next-intl/server';
// import { getNode } from '@/lib/api/drupal/queries';

// async
export default async function Footer() {
  const t = await getTranslations('Footer');
  const tCommon = await getTranslations('Common');
  // const locale = await getLocale();

  /*
  const node = await getNode('page', 'a13c1495-9d45-4439-a8c2-e93d4fdc32f4', locale);

  if (!node) {
    return null;
  }

  // const title = node.attributes.title;
  // const description = node.attributes.body.value;
  */

  // const description = 'test';

  return (
    <footer className="bg-gray-100 dark:bg-gray-800 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* About Column */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {tCommon('title')}
            </h2>
            <div className="text-gray-600 dark:text-gray-300 mb-4">{tCommon('description')}</div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('quickLinks.title')}
            </h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t('quickLinks.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('resources.title')}
            </h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/example"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t('resources.example')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('links.title')}
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://iiif.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  IIIF
                </a>
              </li>
              <li>
                <a
                  href="https://iiif.io/api/presentation/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  IIIF Presentation API
                </a>
              </li>
              <li>
                <a
                  href="https://projectmirador.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Mirador
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-center items-center">
            <p className="text-gray-600 dark:text-gray-300">{t('copyright')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
