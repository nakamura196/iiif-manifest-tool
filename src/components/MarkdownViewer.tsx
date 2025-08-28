'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-lg dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize rendering of various markdown elements
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mb-3 mt-6 text-gray-800 dark:text-gray-200">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mb-2 mt-4 text-gray-800 dark:text-gray-200">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 text-gray-700 dark:text-gray-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 text-gray-700 dark:text-gray-300">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="mb-1">{children}</li>
          ),
          code: (props: { children?: React.ReactNode; className?: string }) => {
            const { children, className } = props;
            const isInline = !className?.includes('language-');
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto font-mono text-sm">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-700 dark:text-gray-300">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="rounded-lg shadow-md max-w-full h-auto"
            />
          ),
          hr: () => (
            <hr className="my-6 border-gray-300 dark:border-gray-700" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};