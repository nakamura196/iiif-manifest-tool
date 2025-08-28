import { notFound } from 'next/navigation';
import { promises as fs } from 'fs';
import path from 'path';
import { MarkdownViewer } from '@/components/MarkdownViewer';
import Link from 'next/link';
import { FiArrowLeft, FiBook, FiFileText } from 'react-icons/fi';

// Available documentation files
const DOCS = {
  'getting-started': {
    title: 'Getting Started',
    titleJa: 'はじめに',
    file: 'getting-started.md'
  },
  'user-guide': {
    title: 'User Guide',
    titleJa: 'ユーザーガイド',
    file: 'user-guide.md'
  },
  'api-guide': {
    title: 'API Guide',
    titleJa: 'APIガイド',
    file: 'api-guide.md'
  },
  'iiif-integration': {
    title: 'IIIF Integration',
    titleJa: 'IIIF統合',
    file: 'iiif-integration.md'
  },
  'technical-architecture': {
    title: 'Technical Architecture',
    titleJa: '技術アーキテクチャ',
    file: 'technical-architecture.md'
  }
};

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({
    slug,
  }));
}

export default async function DocumentPage({ params }: PageProps) {
  const { slug, locale } = await params;
  
  const doc = DOCS[slug as keyof typeof DOCS];
  if (!doc) {
    notFound();
  }

  // Read the markdown file based on locale
  const docsDir = path.join(process.cwd(), 'docs');
  const isJa = locale === 'ja';
  
  // Try to read locale-specific file first, then fallback to default
  let filePath: string;
  let content: string;
  
  if (!isJa) {
    // For English, try to read from en subfolder first
    const enFilePath = path.join(docsDir, 'en', doc.file);
    try {
      content = await fs.readFile(enFilePath, 'utf8');
      filePath = enFilePath;
    } catch {
      // Fallback to default (Japanese) file
      filePath = path.join(docsDir, doc.file);
      try {
        content = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        console.error(`Failed to read documentation file: ${filePath}`, error);
        notFound();
      }
    }
  } else {
    // For Japanese, read default file
    filePath = path.join(docsDir, doc.file);
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(`Failed to read documentation file: ${filePath}`, error);
      notFound();
    }
  }

  const title = isJa ? doc.titleJa : doc.title;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/docs`}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiArrowLeft className="text-xl" />
              </Link>
              <div className="flex items-center gap-2">
                <FiBook className="text-xl text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sticky top-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiFileText />
                {isJa ? 'ドキュメント' : 'Documentation'}
              </h2>
              <nav className="space-y-2">
                {Object.entries(DOCS).map(([key, docInfo]) => (
                  <Link
                    key={key}
                    href={`/${locale}/docs/${key}`}
                    className={`block px-3 py-2 rounded-lg transition-colors ${
                      key === slug
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {isJa ? docInfo.titleJa : docInfo.title}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
              <MarkdownViewer content={content} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}