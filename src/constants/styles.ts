export const PROSE_STYLES = `
  [&>p]:my-6 [&>p]:mb-6
  prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
  prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
  prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
  prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
  prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
  prose-img:rounded-lg prose-img:shadow-md dark:prose-img:shadow-gray-800 prose-img:my-8
  prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-bold
  prose-ul:list-disc prose-ul:pl-6 prose-ul:my-6
  prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-6
  prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:mb-2
  prose-table:border-collapse prose-table:w-full
  prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:p-3 prose-th:bg-gray-50 dark:prose-th:bg-gray-800
  prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:p-3
  prose-blockquote:border-l-4 prose-blockquote:border-blue-500 dark:prose-blockquote:border-blue-400
  prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300
`.trim();

export const CONTAINER_STYLES = {
  base: 'container mx-auto px-4',
  withPadding: 'container mx-auto px-4 py-8',
  withLargePadding: 'container mx-auto px-4 py-12',
} as const;

export const GRID_STYLES = {
  cols2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  cols3: 'grid grid-cols-1 md:grid-cols-3 gap-6',
  cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
} as const;