import { FiHelpCircle } from 'react-icons/fi';
import Link from 'next/link';
import { promises as fs } from 'fs';
import path from 'path';
import { MarkdownViewer } from '@/components/MarkdownViewer';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const isJa = locale === 'ja';

  return {
    title: isJa ? 'よくある質問 - 画像コレクション管理' : 'FAQ - Image Collection Manager',
    description: isJa
      ? '画像コレクション管理ツールの使い方に関するよくある質問'
      : 'Frequently asked questions about using the Image Collection Manager',
  };
}

export default async function FAQPage({ params }: PageProps) {
  const { locale } = await params;
  const isJa = locale === 'ja';

  // Read FAQ content from markdown file
  const faqPath = path.join(process.cwd(), 'docs', isJa ? 'faq.md' : 'en/faq.md');
  const faqContent = await fs.readFile(faqPath, 'utf-8');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <FiHelpCircle className="text-6xl" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              {isJa ? 'よくある質問' : 'Frequently Asked Questions'}
            </h1>
            <p className="text-xl text-blue-100">
              {isJa
                ? '画像コレクション管理ツールの使い方に関するよくある質問'
                : 'Common questions about using the Image Collection Manager'}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Markdown Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-12">
            <MarkdownViewer content={faqContent} />
          </div>

          {/* Call to Action */}
          <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {isJa ? 'さらに質問がありますか？' : 'Have More Questions?'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isJa
                ? 'このFAQで解決しない問題がある場合は、API認証情報ページでSwagger UIを確認するか、 GitHubのIssuesで質問してください。'
                : 'If you have issues not covered by this FAQ, check the Swagger UI on the API Authentication Info page or ask questions on GitHub Issues.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/api-doc/auth-info`}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {isJa ? 'API認証情報を見る' : 'View API Auth Info'}
              </Link>
              <a
                href="https://github.com/nakamura196/iiif-manifest-tool"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {isJa ? 'GitHubで質問' : 'Ask on GitHub'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
