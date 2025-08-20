# ドキュメント

このディレクトリには、プロジェクトに関するドキュメントとブログ記事が含まれています。

## ブログ記事

### 技術記事

- [Next.js 15 で output: 'export' 使用時の sitemap.ts 実装方法](./blog/nextjs-sitemap-with-static-export.md)
  - Next.js 15で静的エクスポート時にsitemap.tsを使用する方法
  - `export const dynamic = 'force-static'`と`export const revalidate = false`の設定について

### プロジェクト紹介

- [Next.js 15対応 多言語・ダークモード対応SSRテンプレート](./blog/nextjs-i18n-themes-ssr-template.md)
  - テンプレートプロジェクトの概要と機能紹介
  - 技術スタックと実装の特徴

## ドキュメント構造

```
docs/
├── README.md          # このファイル
└── blog/              # ブログ記事
    ├── nextjs-sitemap-with-static-export.md
    └── nextjs-i18n-themes-ssg-template.md
```

## 記事の追加方法

新しい記事を追加する場合は、`blog/`ディレクトリに Markdown ファイルを作成してください。

### 記事のフォーマット

```markdown
# タイトル

## 概要
記事の概要を記述

## 内容
詳細な内容

## タグ
- タグ1
- タグ2
```