# Next.js 15 で output: 'export' 使用時の sitemap.ts 実装方法

## 背景

Next.js 15で静的サイト生成（`output: 'export'`）を使用する際、`sitemap.ts`の実装でエラーが発生する場合があります。

```
Error: export const dynamic = "force-static"/export const revalidate not configured on route "/sitemap.xml" with "output: export".
```

## 解決方法

この問題は、`sitemap.ts`に以下の2つのエクスポートを追加することで解決できます：

```typescript
// src/app/sitemap.ts
import { MetadataRoute } from 'next';

export const dynamic = 'force-static';
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  // sitemap生成ロジック
}
```

## 実装例

```typescript
import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-static';
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const staticPages = [
    '', // Home page
    '/about',
    '/example',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = routing.locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === '' ? 'daily' : 'weekly' as const,
      priority: page === '' ? 1 : 0.8,
    }))
  );

  return sitemapEntries;
}
```

## 動作確認

この実装により、`npm run build`実行時に`/out/sitemap.xml`が正常に生成されます。

## 注意点

- `dynamic = 'force-static'`のみでは不十分で、`revalidate = false`も必要です
- 環境変数やインポートしたモジュールの使用も可能です
- ビルド時に静的に解決される値であれば、動的な値も使用できます

## 代替案

もし上記の方法で解決しない場合は、以下の代替案があります：

1. ビルドスクリプトでsitemap.xmlを生成
2. publicディレクトリに静的なsitemap.xmlを配置

## まとめ

Next.js 15で`output: 'export'`を使用する場合でも、適切な設定を追加することで`sitemap.ts`を使用したサイトマップ生成が可能です。この方法により、Next.jsの標準機能を活用しつつ、型安全性を保ったサイトマップ生成が実現できます。

## 参考資料

- [GitHub Issue: Next.js #59136](https://github.com/vercel/next.js/issues/59136#issuecomment-2851322972)
- [Qiita: Next.js 14でSSGモードでビルドするときにsitemap.xmlがエラーで生成されない問題](https://qiita.com/sonneko/items/892717ca3081cc006d82)
- [Next.js SSGでsitemap.xmlを自動生成する](https://lazy-developer.jp/nextjs-ssg-sitemap-xml-generation)

## タグ

- Next.js
- SSG
- sitemap
- SEO
- Next.js15