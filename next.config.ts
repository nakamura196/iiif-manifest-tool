import type { NextConfig } from 'next';

import createNextIntlPlugin from 'next-intl/plugin';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // サブディレクトリでのホスティングに対応
  basePath,
};

export default withNextIntl(nextConfig);
