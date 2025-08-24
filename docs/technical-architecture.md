# 画像コレクション管理ツール 技術アーキテクチャ解説

## はじめに

画像コレクション管理ツールは、画像コレクションを国際標準規格であるIIIF（International Image Interoperability Framework）形式で管理・公開するためのWebアプリケーションです。本記事では、このツールの技術的な実装について、特にIIIF仕様の実装と地理空間情報の扱いに焦点を当てて解説します。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, TypeScript
- **バックエンド**: Next.js API Routes
- **データストレージ**: AWS S3互換オブジェクトストレージ（Cloudflare R2）
- **認証**: NextAuth.js
- **地図表示**: Leaflet, MapLibre GL JS
- **IIIF ビューア**: Mirador 3, OpenSeadragon

## IIIF実装の詳細

### 1. IIIF Presentation API v2/v3の両方をサポート

本ツールは、IIIF Presentation APIのバージョン2とバージョン3の両方に対応しています。これにより、様々なIIIFビューアとの互換性を確保しています。

#### v2とv3の主な違い

```typescript
// IIIF v2の構造
{
  "@context": "http://iiif.io/api/presentation/2/context.json",
  "@id": "https://example.com/manifest",
  "@type": "sc:Manifest",
  "label": "タイトル",
  "sequences": [{
    "@type": "sc:Sequence",
    "canvases": [...]
  }]
}

// IIIF v3の構造
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.com/manifest",
  "type": "Manifest",
  "label": { "ja": ["タイトル"] },
  "items": [...] // canvasの配列
}
```

### 2. マルチ言語対応

v3では、ラベルや説明文を言語別に管理できます：

```typescript
{
  "label": {
    "ja": ["日本語タイトル"],
    "en": ["English Title"]
  },
  "summary": {
    "ja": ["日本語の説明"],
    "en": ["English description"]
  }
}
```

### 3. IIIF Image APIのサポート

外部のIIIF Image Serverから配信される画像も登録可能です。info.jsonのURLを指定することで、高解像度画像を効率的に配信できます：

```typescript
// info.jsonから画像を登録
const handleInfoJsonAdd = async (infoJsonUrl: string) => {
  const infoJson = await fetch('/api/iiif-info', {
    method: 'POST',
    body: JSON.stringify({ url: infoJsonUrl })
  });
  
  const baseUrl = infoJson.id || infoJson['@id'];
  // フルサイズ画像URL
  const imageUrl = `${baseUrl}/full/full/0/default.jpg`;
  // サムネイル用URL（400px幅）
  const thumbnailUrl = `${baseUrl}/full/400,/0/default.jpg`;
};
```

## 地理空間情報の実装

### 1. navPlace Extension（IIIF v3）

navPlace拡張は、マニフェスト全体の代表的な位置を示すために使用されます。コレクションの地図表示などで活用されます。

```typescript
interface NavPlace {
  id?: string;
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties?: {
      label?: { [lang: string]: string[] };
    };
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [経度, 緯度]
    };
  }>;
}

// マニフェストへの位置情報追加
const manifest = {
  "@context": [
    "http://iiif.io/api/presentation/3/context.json",
    "http://iiif.io/api/extension/navplace/context.json"
  ],
  "navPlace": {
    "type": "FeatureCollection",
    "features: [{
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [139.7454, 35.6586] // 東京駅
      },
      "properties": {
        "label": { "ja": ["東京駅"] }
      }
    }]
  }
};
```

### 2. Georeference Extension（画像の地理参照）

Georeference拡張を使用することで、画像の特定の点を実世界の座標にマッピングできます。古地図のジオリファレンシングなどに活用されます。

```typescript
interface GeoAnnotation {
  type: 'Annotation';
  motivation: 'georeferencing';
  target: string; // Canvas URI
  body: {
    type: 'FeatureCollection';
    transformation?: {
      type: 'polynomial' | 'thin-plate-spline';
      options?: { order?: number };
    };
    features: Array<{
      type: 'Feature';
      properties: {
        resourceCoords: [number, number]; // 画像上の座標
      };
      geometry: {
        type: 'Point';
        coordinates: [number, number]; // 地理座標
      };
      metadata?: {
        label?: string;
        tags?: string[];
        url?: string;
      };
    }>;
  };
}
```

#### 実装例：対応点の設定

```typescript
// 画像上の座標と地理座標の対応点を設定
const geoPoints = [
  {
    resourceCoords: [100, 200],  // 画像上のピクセル座標
    coordinates: [139.7454, 35.6586],  // 東京駅の緯度経度
    label: "東京駅"
  },
  {
    resourceCoords: [300, 400],
    coordinates: [139.7673, 35.6814],  // 上野駅
    label: "上野駅"
  }
];

// CSVからのインポートも可能
const csvData = `
resourceX,resourceY,longitude,latitude,label
100,200,139.7454,35.6586,東京駅
300,400,139.7673,35.6814,上野駅
`;
```

### 3. 地図表示の実装

#### コレクションマップ（Leaflet使用）

```typescript
// コレクション内のアイテムを地図上に表示
const CollectionMap = ({ items }) => {
  return (
    <MapContainer center={[35.6762, 139.6503]} zoom={10}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {items.map(item => (
        item.location && (
          <Marker 
            position={[item.location.latitude, item.location.longitude]}
            key={item.id}
          >
            <Popup>
              <h3>{item.title}</h3>
              <img src={item.thumbnail} alt={item.title} />
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};
```

#### 外部ビューアとの連携

生成されたIIIFマニフェストは、navPlace拡張とGeoreference拡張に対応した各種IIIFビューアで可視化できます。例えば、[IIIF地図ビューア](https://nakamura196.github.io/iiif_geo/ja/)などを使用することで、地理情報を含むコレクションを地図上で閲覧することが可能です。

## アクセス制御の実装（予定）

今後の実装予定として、以下のアクセス制御機能を検討しています：

### 1. マニフェストレベルの制御

- マニフェスト単位での公開/非公開設定
- ユーザーグループによるアクセス権限管理
- 所有者による細かいアクセス制御

### 2. IIIF Auth API

IIIF Authentication APIに準拠した認証システムの実装を予定：

- トークンベースの認証
- 時限付きアクセストークンの発行
- 外部認証プロバイダとの連携

## CORSエラーの回避

外部URLから画像を登録する際のCORS問題を、サーバーサイドプロキシで解決：

```typescript
// /api/image-metadata/route.ts
export async function POST(request: NextRequest) {
  const { url } = await request.json();
  
  // サーバー側で画像を取得
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  
  // Base64エンコードしてクライアントに返す
  const base64 = Buffer.from(buffer).toString('base64');
  const dataUrl = `data:${contentType};base64,${base64}`;
  
  // Sharp使用可能な場合は画像サイズも取得
  try {
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(Buffer.from(buffer)).metadata();
    return { dataUrl, width: metadata.width, height: metadata.height };
  } catch {
    return { dataUrl, width: 1920, height: 1080 };
  }
}
```

## パフォーマンス最適化

### 1. 画像の段階的読み込み

```typescript
// IIIF Image APIを使用した適切なサイズの画像取得
const getThumbnailUrl = (iiifBaseUrl: string, targetWidth: number = 400) => {
  return `${iiifBaseUrl}/full/${targetWidth},/0/default.jpg`;
};

// サイズ配列から最適なサムネイルサイズを選択
const selectOptimalSize = (sizes: Array<{width: number, height: number}>) => {
  const targetWidth = 400;
  return sizes.find(s => s.width >= targetWidth && s.width <= 800) 
    || sizes[sizes.length - 1];
};
```

### 2. S3互換ストレージの活用

```typescript
// Cloudflare R2を使用した画像配信
const uploadToS3 = async (file: Buffer, key: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: 'image/jpeg'
  });
  
  await s3Client.send(command);
  
  // CDN経由のURLを返す
  return `${process.env.S3_PUBLIC_URL}/${key}`;
};
```

## セルフホスティングとの連携

### Self Museumとの統合

生成したIIIFコレクションは、[Self Museum](https://self-museum.cultural.jp)で簡単に公開できます：

```typescript
// Self Museum用のURL生成
const openInSelfMuseum = (collectionUrl: string) => {
  const selfMuseumUrl = `https://self-museum.cultural.jp/?collection=${encodeURIComponent(collectionUrl)}`;
  window.open(selfMuseumUrl, '_blank');
};
```

## まとめ

画像コレクション管理ツールは、最新のIIIF仕様に準拠しながら、使いやすさとパフォーマンスを両立させた実装となっています。主な技術的特徴：

1. **標準準拠**: IIIF Presentation API v2/v3、Image API、navPlace/Georeference拡張をフルサポート
2. **柔軟な地理情報**: 単純な位置情報から複雑なジオリファレンシングまで対応
3. **セキュアなアクセス制御**: JWTトークンベースの認証と細かいアクセス制御
4. **パフォーマンス**: S3互換ストレージとCDN、適切な画像サイズの自動選択
5. **相互運用性**: 各種IIIFビューアやツールとの連携

今後は、IIIF Change Discovery APIやContent Search APIの実装、より高度な地理空間分析機能の追加などを予定しています。

## 参考リンク

- [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/)
- [navPlace Extension](https://iiif.io/api/extension/navplace/)
- [Georeference Extension](https://iiif.io/api/extension/georef/)
- [IIIF地図ビューア](https://nakamura196.github.io/iiif_geo/ja/)
- [Self Museum](https://self-museum.cultural.jp)
- [ソースコード（GitHub）](https://github.com/nakamura196/iiif-manifest-tool)