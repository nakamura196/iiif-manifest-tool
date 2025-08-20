# Next.js 15対応 多言語・ダークモード対応SSRテンプレート

## 概要

このテンプレートは、Next.js 15を使用したサーバーサイドレンダリング（SSR）に対応し、多言語対応とダークモードを標準装備したモダンなWebアプリケーション開発の出発点です。TypeScript、Tailwind CSS、next-intl、next-themesを組み合わせ、開発効率とユーザー体験を最大化します。

## 主な機能

### 1. サーバーサイドレンダリング（SSR）
- ダイナミックなコンテンツ生成
- リアルタイムデータ対応とSEO最適化
- 柔軟なコンテンツ更新

### 2. 国際化対応（i18n）
- next-intlによる完全な多言語サポート
- 日本語・英語対応（簡単に言語追加可能）
- URLベースの言語切り替え（`/ja/about`、`/en/about`）
- 型安全な翻訳キー

### 3. ダークモード
- next-themesによるシステム連動ダークモード
- ユーザーの好みを自動検出
- スムーズなテーマ切り替えアニメーション
- LocalStorageによる設定の永続化

### 4. 開発者体験の向上
- TypeScriptによる型安全性
- Tailwind CSSによる効率的なスタイリング
- ESLintによるコード品質管理
- 統一されたコンポーネント構造

## 技術スタック

```json
{
  "dependencies": {
    "next": "^15.4.4",
    "react": "^19.1.0",
    "next-intl": "^4.3.4",
    "next-themes": "^0.4.6",
    "tailwindcss": "^4.1.11",
    "@tailwindcss/typography": "^0.5.16"
  }
}
```

## プロジェクト構造

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx      # ルートレイアウト
│   │   ├── page.tsx        # ホームページ
│   │   ├── about/          # Aboutページ
│   │   └── example/        # サンプルページ
│   ├── icon.svg           # ファビコン
│   └── sitemap.ts         # サイトマップ生成
├── components/
│   ├── layout/            # レイアウトコンポーネント
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── PageLayout.tsx
│   │   ├── ToggleTheme.tsx
│   │   └── ToggleLanguage.tsx
│   └── page/              # ページ固有コンポーネント
├── i18n/
│   └── routing.ts         # i18n設定
└── messages/              # 翻訳ファイル
    ├── en.json
    └── ja.json
```

## 特徴的な実装

### 1. sitemap.ts の実装

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  // 実装
}
```

### 2. 統一されたページレイアウト

```typescript
<PageLayout 
  breadcrumbItems={breadcrumbItems} 
  title={t('title')}
  description={t('description')}
>
  <YourContent />
</PageLayout>
```

### 3. 環境変数による設定

```bash
# .env.example
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_PATH=
```

## 使い方

### インストール

```bash
git clone [repository-url]
cd nextjs-i18n-themes-ssr-template
npm install
```

### 開発

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### カスタマイズポイント

1. **言語追加**: `src/i18n/routing.ts`と`messages/`ディレクトリ
2. **ページ追加**: `src/app/[locale]/`配下に新規ディレクトリ
3. **テーマカスタマイズ**: `tailwind.config.js`とグローバルCSS
4. **メタデータ**: 各ページの`generateMetadata`関数

## ベストプラクティス

1. **コンポーネント命名**: PascalCaseを使用
2. **翻訳キー**: ネストした構造で整理
3. **型安全性**: TypeScriptの型を最大限活用
4. **パフォーマンス**: 静的生成を活用したキャッシュ戦略

## まとめ

このテンプレートは、モダンなNext.jsアプリケーションの開発に必要な基盤をすべて提供します。国際化対応とダークモード機能を標準装備し、SEOに最適化されたダイナミックなサイトを素早く構築できます。開発者の生産性を向上させながら、エンドユーザーに優れた体験を提供することができます。

## リポジトリ

[GitHub - nextjs-i18n-themes-ssr-template](https://github.com/yourusername/nextjs-i18n-themes-ssr-template)

## タグ

- Next.js
- TypeScript
- i18n
- SSR
- TailwindCSS