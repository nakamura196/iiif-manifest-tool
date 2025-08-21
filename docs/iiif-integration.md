# IIIF機能ガイド

## IIIFとは

IIIF（International Image Interoperability Framework）は、デジタル画像とそのメタデータを共有するための国際標準規格です。世界中の美術館、図書館、アーカイブで採用されています。

### 主な利点

- **相互運用性**: 異なるシステム間で画像を共有
- **高品質表示**: ズーム可能な高解像度画像
- **標準化**: 統一されたAPIとデータ形式
- **豊富な機能**: アノテーション、比較、検索など

## IIIF Presentation API

### Manifestの構造

本アプリケーションは、IIIF Presentation API 3.0に準拠したManifestを生成します。

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.com/api/iiif/manifest.json",
  "type": "Manifest",
  "label": {
    "ja": ["コレクションタイトル"]
  },
  "metadata": [
    {
      "label": { "ja": ["作成者"] },
      "value": { "ja": ["作者名"] }
    }
  ],
  "items": [
    {
      "id": "canvas-1",
      "type": "Canvas",
      "label": { "ja": ["画像タイトル"] },
      "width": 1920,
      "height": 1080,
      "items": [...]
    }
  ]
}
```

### Manifestの取得方法

#### コレクション全体のManifest

```
GET /api/iiif/collection/{collectionId}/manifest.json
```

#### 個別アイテムのManifest

```
GET /api/iiif/{userId}_{collectionId}_{itemId}/manifest.json
```

### Manifestのカスタマイズ

アイテム編集画面で以下の情報を設定できます：

- **label**: アイテムのタイトル
- **metadata**: カスタムフィールドによる追加情報
- **attribution**: 帰属表示
- **rights**: ライセンス情報
- **navDate**: タイムライン表示用の日付

## IIIF Image API

### 画像URLの構造

IIIF Image APIに準拠した画像URLを使用：

```
{scheme}://{server}{/prefix}/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

例：
```
https://example.com/api/iiif/image/image-id/full/1000,/0/default.jpg
```

### パラメータ説明

#### Region（領域）
- `full`: 画像全体
- `x,y,w,h`: 指定領域の切り出し
- `pct:x,y,w,h`: パーセンテージ指定

#### Size（サイズ）
- `full`: オリジナルサイズ
- `w,`: 幅指定（高さ自動）
- `,h`: 高さ指定（幅自動）
- `!w,h`: 指定サイズに収まるよう縮小

#### Rotation（回転）
- `0`: 回転なし
- `90`, `180`, `270`: 時計回りの回転
- `!90`: 反時計回り

#### Quality（品質）
- `default`: デフォルト品質
- `color`: カラー
- `gray`: グレースケール
- `bitonal`: 2値化

### info.jsonの取得

```
GET /api/iiif/image/{imageId}/info.json
```

**レスポンス例:**
```json
{
  "@context": "http://iiif.io/api/image/3/context.json",
  "id": "https://example.com/api/iiif/image/image-id",
  "type": "ImageService3",
  "protocol": "http://iiif.io/api/image",
  "width": 1920,
  "height": 1080,
  "profile": "level2",
  "tiles": [
    {
      "width": 512,
      "height": 512,
      "scaleFactors": [1, 2, 4, 8]
    }
  ]
}
```

## IIIFビューアとの連携

### Mirador

高機能なIIIFビューアで、以下の機能を提供：

1. **起動方法**
   - アイテムの「Miradorで開く」ボタンをクリック
   - または直接URL: `/mirador?manifest={manifestUrl}`

2. **主な機能**
   - 複数画像の比較表示
   - アノテーション作成
   - 画像の計測
   - メタデータ表示

3. **カスタマイズ例**
```javascript
const miradorConfig = {
  id: 'mirador-viewer',
  manifests: {
    'manifest-url': {
      provider: 'Your Institution'
    }
  },
  windows: [{
    manifestId: 'manifest-url',
    canvasId: 'canvas-id'
  }],
  theme: {
    palette: {
      primary: {
        main: '#1976d2'
      }
    }
  }
};
```

### OpenSeadragon

軽量で高速なディープズーム画像ビューア：

1. **特徴**
   - スムーズなズーム/パン
   - タイルベースの画像読み込み
   - モバイル対応

2. **組み込み例**
```html
<div id="openseadragon-viewer"></div>
<script>
  OpenSeadragon({
    id: "openseadragon-viewer",
    tileSources: "/api/iiif/image/image-id/info.json"
  });
</script>
```

### Universal Viewer

多機能なIIIFビューア：

1. **対応フォーマット**
   - 画像
   - PDF
   - 3Dモデル
   - 音声/動画

2. **埋め込みコード**
```html
<iframe
  src="https://universalviewer.io/uv.html?manifest={manifestUrl}"
  width="100%"
  height="600"
  allowfullscreen
></iframe>
```

## 外部IIIFリソースの利用

### IIIF画像のインポート

1. **info.jsonからのインポート**
   - 新規アイテム作成時に「info.jsonから追加」を選択
   - info.jsonのURLを入力
   - 自動的に画像情報を取得

2. **対応しているIIIFサービス**
   - 国立国会図書館デジタルコレクション
   - Europeana
   - Internet Archive
   - その他IIIF対応機関

### IIIF Collectionの作成

複数のManifestをまとめたCollectionを作成：

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.com/api/iiif/collection.json",
  "type": "Collection",
  "label": { "ja": ["コレクション名"] },
  "items": [
    {
      "id": "manifest-1.json",
      "type": "Manifest",
      "label": { "ja": ["アイテム1"] }
    },
    {
      "id": "manifest-2.json",
      "type": "Manifest",
      "label": { "ja": ["アイテム2"] }
    }
  ]
}
```

## IIIF活用例

### 1. デジタル展示会

```javascript
// 展示会用Manifestの作成
const exhibition = {
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "type": "Manifest",
  "label": { "ja": ["浮世絵展"] },
  "summary": { "ja": ["江戸時代の浮世絵コレクション"] },
  "structures": [
    {
      "type": "Range",
      "label": { "ja": ["第1章: 初期浮世絵"] },
      "items": ["canvas-1", "canvas-2"]
    }
  ]
};
```

### 2. 学術研究での利用

- 高解像度画像の詳細分析
- 複数資料の比較研究
- アノテーションによる共同研究
- 引用可能なURIによる参照

### 3. 教育での活用

- インタラクティブな教材作成
- 画像の部分拡大による説明
- 生徒による注釈の追加
- 複数資料の並列表示

## トラブルシューティング

### CORS（Cross-Origin Resource Sharing）エラー

**問題**: 外部サイトからManifestにアクセスできない

**解決方法**:
```javascript
// APIレスポンスヘッダーの設定
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}
```

### 画像が表示されない

**確認事項**:
1. info.jsonのURLが正しいか
2. 画像サーバーがIIIF Image APIに対応しているか
3. 画像のアクセス権限が適切か

### Manifestの検証

IIIFコミュニティが提供する検証ツールを使用：
- [IIIF Manifest Validator](https://presentation-validator.iiif.io/)

## リソースとドキュメント

- [IIIF公式サイト](https://iiif.io/)
- [IIIF Cookbook](https://iiif.io/api/cookbook/)
- [Awesome IIIF](https://github.com/IIIF/awesome-iiif)
- [IIIF日本コミュニティ](https://iiif.jp/)

## 次のステップ

IIIFの基本を理解したら、[API連携ガイド](api-guide.md)でプログラマティックな活用方法を学習してください。