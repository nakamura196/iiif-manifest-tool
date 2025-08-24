# 画像コレクション管理ツール

IIIF（International Image Interoperability Framework）に準拠したマニフェストを生成し、画像コレクションを管理するためのWebアプリケーション。

## 🚀 特徴

- **📚 IIIF準拠**: IIIF Presentation API 2.1/3.0に完全準拠
- **🔐 認証機能**: Google OAuth認証とIIIF Auth APIサポート
- **🌍 多言語対応**: 日本語/英語の切り替え機能
- **🌓 ダークモード**: システム連動のテーマ切り替え
- **📁 コレクション管理**: 複数のマニフェストをコレクションとして管理
- **🖼️ 画像アップロード**: S3互換ストレージへの画像アップロード機能
- **🔍 Mirador統合**: IIIF対応ビューワーMiradorの組み込み
- **📊 API提供**: RESTful APIとOpenAPI仕様書の自動生成

## 📋 必要要件

- Node.js 18.x以上
- npm または yarn
- SQLite（開発環境）またはPostgreSQL（本番環境）
- S3互換オブジェクトストレージ（画像保存用）

## 🛠️ セットアップ

### 1. リポジトリのクローン

```bash
git clone [your-repo-url]
cd iiif-manifest-tool
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example`をコピーして`.env`を作成：

```bash
cp .env.example .env
```

以下の環境変数を設定：

```env
# サイトURL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 認証設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key # openssl rand -base64 32 で生成

# Google OAuth（任意）
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# データベース
DATABASE_URL=file:./dev.db

# S3ストレージ
MDX_S3_ENDPOINT=https://s3.amazonaws.com
MDX_S3_REGION=us-east-1
MDX_S3_ACCESS_KEY_ID=your-access-key
MDX_S3_SECRET_ACCESS_KEY=your-secret-key
MDX_S3_BUCKET_NAME=your-bucket-name

# IIIF設定
JWT_SECRET=your-jwt-secret # openssl rand -base64 32 で生成
IIIF_API_VERSION=3
```

### 4. データベースのセットアップ

```bash
npx prisma migrate dev
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)でアプリケーションが起動します。

## 📁 プロジェクト構造

```
src/
├── app/
│   ├── [locale]/         # 多言語対応ページ
│   │   ├── dashboard/    # ダッシュボード
│   │   └── about/        # アバウトページ
│   ├── api/              # API エンドポイント
│   │   ├── auth/         # 認証API
│   │   ├── collections/  # コレクションAPI
│   │   ├── iiif/         # IIIF API
│   │   └── upload/       # アップロードAPI
│   └── api-doc/          # API ドキュメント
├── components/           # React コンポーネント
├── lib/                  # ライブラリ関数
│   ├── iiif.ts          # IIIF関連
│   ├── auth.ts          # 認証関連
│   └── s3.ts            # S3ストレージ関連
├── messages/             # 翻訳ファイル
└── prisma/               # データベーススキーマ
```

## 🔧 主な機能

### コレクション管理

- コレクションの作成・編集・削除
- コレクション内のアイテム管理
- メタデータの編集

### IIIF マニフェスト生成

- IIIF Presentation API 2.1/3.0準拠
- 画像シーケンスの管理
- メタデータの設定

### 画像管理

- ドラッグ&ドロップによる画像アップロード
- S3互換ストレージへの保存
- サムネイル生成

### 認証・アクセス制御

- Google OAuth認証
- IIIF Auth API実装
- プローブサービス
- アクセストークン管理

### API提供

- RESTful API
- OpenAPI仕様書の自動生成
- Swagger UIによるAPIドキュメント

## 📚 API エンドポイント

### コレクション

- `GET /api/collections` - コレクション一覧
- `POST /api/collections` - コレクション作成
- `GET /api/collections/{id}` - コレクション詳細
- `PUT /api/collections/{id}` - コレクション更新
- `DELETE /api/collections/{id}` - コレクション削除

### IIIF

- `GET /api/iiif/3/{id}/manifest` - IIIF v3 マニフェスト
- `GET /api/iiif/{id}/manifest` - IIIF v2.1 マニフェスト
- `GET /api/iiif/collection/{id}` - IIIF コレクション
- `GET /api/iiif/image/{path}` - 画像配信

### 認証

- `GET /api/iiif/auth/probe/{id}` - プローブサービス
- `GET /api/iiif/auth/access/{id}` - アクセストークン
- `POST /api/iiif/auth/token/{id}` - トークン取得

詳細は `/api-doc` のSwagger UIを参照してください。

## 🚀 ビルドとデプロイ

### ビルド

```bash
npm run build
```

### プロダクション実行

```bash
npm run start
```

### Docker（オプション）

```bash
docker build -t image-collection-tool .
docker run -p 3000:3000 --env-file .env image-collection-tool
```

## 🧪 テスト

```bash
npm run test        # ユニットテスト
npm run test:e2e    # E2Eテスト
```

## 📝 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **認証**: NextAuth.js
- **データベース**: Prisma ORM (SQLite/PostgreSQL)
- **ストレージ**: AWS S3 SDK
- **UI**: React 19, Tailwind CSS
- **国際化**: next-intl
- **IIIF**: カスタム実装

## 🤝 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容について議論してください。

## 📄 ライセンス

MIT License

## 🔗 関連リンク

- [IIIF公式サイト](https://iiif.io/)
- [IIIF Presentation API](https://iiif.io/api/presentation/)
- [Mirador](https://projectmirador.org/)
- [Next.js Documentation](https://nextjs.org/docs)

## 💡 トラブルシューティング

### データベース接続エラー

```bash
npx prisma generate
npx prisma migrate dev
```

### S3アップロードエラー

- S3の認証情報を確認
- バケットのCORS設定を確認
- エンドポイントURLが正しいか確認

### 認証エラー

- `NEXTAUTH_SECRET`が設定されているか確認
- Google OAuthの設定を確認（使用する場合）
- コールバックURLが正しく設定されているか確認