import Link from 'next/link';
import { FiBook, FiArrowRight, FiFileText, FiBookOpen, FiCode } from 'react-icons/fi';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

const DOCS = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    titleJa: 'はじめに',
    description: 'Learn how to set up and use the Image Collection Manager',
    descriptionJa: '画像コレクション管理ツールのセットアップと使い方を学びます',
    icon: FiBookOpen,
  },
  {
    slug: 'user-guide',
    title: 'User Guide',
    titleJa: 'ユーザーガイド',
    description: 'Detailed guide on using all features',
    descriptionJa: 'すべての機能の詳細な使い方ガイド',
    icon: FiFileText,
  },
  {
    slug: 'api-guide',
    title: 'API Guide',
    titleJa: 'APIガイド',
    description: 'Technical documentation for developers',
    descriptionJa: '開発者向けの技術ドキュメント',
    icon: FiCode,
  },
];

export default async function DocsPage({ params }: PageProps) {
  const { locale } = await params;
  const isJa = locale === 'ja';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <FiBook className="text-3xl text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold">
              {isJa ? 'ドキュメント' : 'Documentation'}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {isJa 
              ? '画像コレクション管理ツールの使い方とAPIリファレンス' 
              : 'Learn how to use the Image Collection Manager and its APIs'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOCS.map((doc) => {
            const Icon = doc.icon;
            return (
              <Link
                key={doc.slug}
                href={`/${locale}/docs/${doc.slug}`}
                className="group bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <Icon className="text-2xl text-blue-600 dark:text-blue-400" />
                  </div>
                  <FiArrowRight className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-3" />
                </div>
                <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {isJa ? doc.titleJa : doc.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {isJa ? doc.descriptionJa : doc.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FiBook />
            {isJa ? 'その他のリソース' : 'Additional Resources'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://iiif.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
            >
              <span className="font-medium">IIIF {isJa ? '公式サイト' : 'Official Website'}</span>
              <FiArrowRight className="text-gray-400" />
            </a>
            <a
              href="https://iiif.io/api/presentation/3.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
            >
              <span className="font-medium">IIIF Presentation API 3.0</span>
              <FiArrowRight className="text-gray-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}