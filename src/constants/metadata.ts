export const SITE_CONFIG = {
  name: {
    ja: '画像コレクション管理ツール',
    en: 'Image Collection Manager',
  },
  description: {
    ja: '画像をまとめて整理・公開・共有できるサービス。美術館品質の国際規格IIIF対応',
    en: 'Service for organizing, publishing, and sharing image collections with museum-quality IIIF standard support',
  },
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
  ogImage: {
    ja: '/ogp-ja.svg',
    en: '/ogp-en.svg',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@yoursite',
    creator: '@yourcreator',
  },
  keywords: {
    ja: '画像管理, コレクション, IIIF, デジタルアーカイブ, 画像共有, 美術館, 博物館, 図書館',
    en: 'image management, collection, IIIF, digital archive, image sharing, museum, library, gallery',
  },
} as const;

export const getMetadata = (locale: 'ja' | 'en') => {
  const title = SITE_CONFIG.name[locale];
  const description = SITE_CONFIG.description[locale];
  const ogImage = SITE_CONFIG.ogImage[locale];
  const keywords = SITE_CONFIG.keywords[locale];

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords,
    metadataBase: new URL(SITE_CONFIG.url),
    openGraph: {
      title,
      description,
      url: SITE_CONFIG.url,
      siteName: title,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: SITE_CONFIG.twitter.card,
      title,
      description,
      site: SITE_CONFIG.twitter.site,
      creator: SITE_CONFIG.twitter.creator,
      images: [ogImage],
    },
    alternates: {
      canonical: SITE_CONFIG.url,
      languages: {
        'ja': `${SITE_CONFIG.url}/ja`,
        'en': `${SITE_CONFIG.url}/en`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },
  };
};

export const getPageMetadata = (
  locale: 'ja' | 'en',
  page: {
    title: string;
    description?: string;
    ogImage?: string;
  }
) => {
  const siteTitle = SITE_CONFIG.name[locale];
  const defaultDescription = SITE_CONFIG.description[locale];
  const defaultOgImage = SITE_CONFIG.ogImage[locale];

  return {
    title: `${page.title} | ${siteTitle}`,
    description: page.description || defaultDescription,
    openGraph: {
      title: `${page.title} | ${siteTitle}`,
      description: page.description || defaultDescription,
      images: [
        {
          url: page.ogImage || defaultOgImage,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
    },
    twitter: {
      card: SITE_CONFIG.twitter.card,
      title: `${page.title} | ${siteTitle}`,
      description: page.description || defaultDescription,
      images: [page.ogImage || defaultOgImage],
    },
  };
};