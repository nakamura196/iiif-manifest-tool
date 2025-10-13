# IIIFリソースの種類について

このページでは、IIIF（International Image Interoperability Framework）で使用される主要なリソースタイプについて説明します。

## IIIF APIの種類

IIIFには主に2つのAPIがあります：

### 1. IIIF Image API
画像そのものを配信するためのAPI。高解像度の画像をさまざまなサイズや形式で提供します。

### 2. IIIF Presentation API
画像のメタデータや表示方法を記述するためのAPI。複数の画像をまとめて管理し、それらをどのように表示するかを定義します。

## info.json（IIIF Image API）

### 概要
- **目的**: 単一の画像に関する情報を提供
- **API**: IIIF Image API
- **用途**: 画像のサイズ、対応フォーマット、タイル情報などを取得

### 構造例
```json
{
  "@context": "http://iiif.io/api/image/3/context.json",
  "id": "https://example.com/iiif/image/abc123",
  "type": "ImageService3",
  "protocol": "http://iiif.io/api/image",
  "width": 6000,
  "height": 4000,
  "sizes": [
    { "width": 150, "height": 100 },
    { "width": 600, "height": 400 },
    { "width": 1200, "height": 800 }
  ],
  "tiles": [
    {
      "width": 512,
      "scaleFactors": [1, 2, 4, 8, 16]
    }
  ]
}
```

### URL例
- `https://example.com/iiif/image/abc123/info.json`
- `https://iiif.io/api/image/3.0/example/reference/918ecd18c2592080851777620de9bcb5-gottingen/info.json`

### 使用場面
- 高解像度画像を段階的に読み込みたい場合
- ズーム機能が必要な場合
- 画像の一部を切り出して表示したい場合

## manifest.json（IIIF Presentation API）

### 概要
- **目的**: 1つまたは複数の画像をまとめたデジタルオブジェクトを表現
- **API**: IIIF Presentation API
- **用途**: 本のページ、絵巻物、複数ビューの美術品など

### 構造例
```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.com/iiif/object/1/manifest.json",
  "type": "Manifest",
  "label": {
    "ja": ["富嶽三十六景"],
    "en": ["Thirty-six Views of Mount Fuji"]
  },
  "items": [
    {
      "id": "https://example.com/iiif/object/1/canvas/1",
      "type": "Canvas",
      "label": { "ja": ["第1図"], "en": ["View 1"] },
      "width": 3000,
      "height": 2000,
      "items": [
        {
          "id": "https://example.com/iiif/object/1/page/1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://example.com/iiif/object/1/annotation/1",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "https://example.com/iiif/image/1/full/max/0/default.jpg",
                "type": "Image",
                "format": "image/jpeg",
                "service": [
                  {
                    "id": "https://example.com/iiif/image/1",
                    "type": "ImageService3"
                  }
                ]
              },
              "target": "https://example.com/iiif/object/1/canvas/1"
            }
          ]
        }
      ]
    }
  ]
}
```

### URL例
- `https://api-iiif.db.kemco.keio.ac.jp/iiif/object/1004/2.1/manifest.json`
- `https://example.com/collection/item/123/manifest.json`

### 使用場面
- 複数ページの資料を表示したい場合
- 見開きページなど複雑なレイアウトが必要な場合
- メタデータ（タイトル、説明、著作権情報など）を含めたい場合
- 外部ビューアー（Mirador、Universal Viewerなど）で表示したい場合

## collection.json（IIIF Presentation API）

### 概要
- **目的**: 複数のマニフェストをまとめて管理
- **API**: IIIF Presentation API
- **用途**: シリーズ、展覧会、アーカイブなど

### URL例
- `https://example.com/iiif/collection/top`
- `https://api-iiif.db.kemco.keio.ac.jp/iiif/collection/abc`

### 使用場面
- 複数の作品やアイテムをグループ化したい場合
- 階層構造を持つコレクションを表現したい場合

## このアプリでの使い分け

### info.jsonを使う場合
✅ **単一の高解像度画像を追加する**
- 1枚の絵画、写真、地図などを追加
- IIIF Image Serverから直接画像を取得
- ズーム機能を活用したい

**入力例**: `https://example.com/iiif/image/abc123/info.json`

### manifest.jsonを使う場合（推奨）
✅ **既存のIIIFリソースから画像をインポートする**
- 他の機関が公開しているIIIF画像を利用
- メタデータも一緒にインポートしたい
- 複数ページの資料から必要なページを選択

**入力例**: `https://api-iiif.db.kemco.keio.ac.jp/iiif/object/1004/2.1/manifest.json`

### collection.jsonを使う場合
✅ **大量のアイテムを一括インポートする**
- シリーズ全体をまとめてインポート
- 複数の作品を一度に追加

**入力例**: `https://example.com/iiif/collection/series1`

## よくある質問

### Q: info.jsonとmanifest.jsonの違いは？
**A**:
- **info.json**: 1枚の画像の情報のみ（画像配信用）
- **manifest.json**: 画像＋メタデータ＋表示方法（プレゼンテーション用）

### Q: どちらを使えばいいですか？
**A**:
- **単一の画像だけ必要** → info.json
- **メタデータも含めて管理したい** → manifest.json（推奨）
- **他の機関のIIIFリソースを利用** → manifest.json

### Q: manifest.jsonから複数の画像が取り込まれるのはなぜ？
**A**: manifest.jsonは複数ページ（Canvas）を含むことができます。各Canvasが1つの画像に対応するため、ページ数分の画像が取り込まれます。

### Q: URLの見分け方は？
**A**:
- `https://～/info.json` → info.json
- `https://～/manifest.json` → manifest.json
- `https://～/collection` → collection.json（拡張子なしの場合もあり）

## 参考リンク

- [IIIF Image API 仕様](https://iiif.io/api/image/)
- [IIIF Presentation API 仕様](https://iiif.io/api/presentation/)
- [IIIF公式サイト](https://iiif.io/)

## 関連ドキュメント

- [使い方ガイド](user-guide.md) - 画像の追加方法
- [IIIF統合ガイド](iiif-integration.md) - 詳しい技術情報
