'use client';

import { FiHelpCircle, FiChevronRight } from 'react-icons/fi';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MarkdownViewer } from '@/components/MarkdownViewer';

interface TOCItem {
  id: string;
  text: string;
  level: number;
  children?: TOCItem[];
}

interface FAQClientProps {
  faqContent: string;
  locale: string;
}

export function FAQClient({ faqContent, locale }: FAQClientProps) {
  const isJa = locale === 'ja';
  const [activeSection, setActiveSection] = useState<string>('');
  const [toc, setToc] = useState<TOCItem[]>([]);

  // Extract table of contents from markdown
  useEffect(() => {
    const headings = extractHeadings(faqContent);
    setToc(headings);
  }, [faqContent]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const headingElements = document.querySelectorAll('h2[id], h3[id]');
      const scrollPosition = window.scrollY + 100;

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i];
        const offsetTop = (element as HTMLElement).offsetTop;

        if (scrollPosition >= offsetTop) {
          setActiveSection(element.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to section on page load if hash is present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      if (hash) {
        // Wait for content to render
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Update URL with hash
      window.history.pushState(null, '', `#${id}`);
    }
  };

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

      {/* Content with TOC */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Table of Contents - Sticky Sidebar */}
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-20">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                    {isJa ? '目次' : 'Table of Contents'}
                  </h2>
                  <nav className="space-y-1">
                    {toc.map((item) => (
                      <div key={item.id}>
                        <a
                          href={`#${item.id}`}
                          onClick={(e) => scrollToSection(e, item.id)}
                          className={`block w-full text-left px-3 py-2 rounded transition-colors text-sm ${
                            activeSection === item.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center">
                            <FiChevronRight className={`mr-2 flex-shrink-0 transition-transform ${
                              activeSection === item.id ? 'rotate-90' : ''
                            }`} />
                            <span className="truncate">{item.text}</span>
                          </div>
                        </a>
                        {item.children && item.children.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1">
                            {item.children.map((child) => (
                              <a
                                key={child.id}
                                href={`#${child.id}`}
                                onClick={(e) => scrollToSection(e, child.id)}
                                className={`block w-full text-left px-3 py-1.5 rounded transition-colors text-xs ${
                                  activeSection === child.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <span className="truncate block">{child.text}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-9">
              {/* Markdown Content */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 md:p-8 mb-12">
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
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to extract headings from markdown
function extractHeadings(markdown: string): TOCItem[] {
  const lines = markdown.split('\n');
  const headings: TOCItem[] = [];
  let currentH2: TOCItem | null = null;

  for (const line of lines) {
    // Match h2 (##)
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      const text = h2Match[1].trim();
      const id = generateId(text);
      currentH2 = { id, text, level: 2, children: [] };
      headings.push(currentH2);
      continue;
    }

    // Match h3 (###)
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match && currentH2) {
      const text = h3Match[1].trim();
      const id = generateId(text);
      currentH2.children!.push({ id, text, level: 3 });
    }
  }

  return headings;
}

// Generate ID from heading text (matches MarkdownViewer logic)
function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, '');
}
