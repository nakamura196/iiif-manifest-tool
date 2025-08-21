# API連携ガイド

## API概要

画像コレクション管理ツールは、RESTful APIを提供しており、外部アプリケーションからコレクションとアイテムを管理できます。

## 認証

### API認証情報の取得

1. ログイン後、プロフィールメニューから「API認証情報」をクリック
2. 以下の情報が表示されます：
   - **APIキー**: 公開キー
   - **シークレットキー**: 秘密キー（安全に保管）

### 認証方法

すべてのAPIリクエストには、以下のヘッダーが必要です：

```http
Authorization: Bearer YOUR_API_KEY
X-API-Secret: YOUR_SECRET_KEY
```

## エンドポイント一覧

### コレクション関連

#### コレクション一覧の取得
```http
GET /api/collections
```

**レスポンス例:**
```json
{
  "collections": [
    {
      "id": "collection-id",
      "name": "コレクション名",
      "description": "説明",
      "isPublic": true,
      "itemCount": 10,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### コレクションの作成
```http
POST /api/collections
Content-Type: application/json

{
  "name": "新しいコレクション",
  "description": "コレクションの説明",
  "isPublic": true
}
```

#### コレクションの更新
```http
PUT /api/collections/{collectionId}
Content-Type: application/json

{
  "name": "更新後の名前",
  "description": "更新後の説明",
  "isPublic": false
}
```

#### コレクションの削除
```http
DELETE /api/collections/{collectionId}
```

### アイテム関連

#### アイテム一覧の取得
```http
GET /api/collections/{collectionId}/items
```

**レスポンス例:**
```json
{
  "items": [
    {
      "id": "item-id",
      "title": "アイテムタイトル",
      "description": "説明",
      "isPublic": true,
      "thumbnail": "https://example.com/thumb.jpg",
      "images": [
        {
          "url": "https://example.com/image.jpg",
          "width": 1920,
          "height": 1080
        }
      ],
      "location": {
        "latitude": 35.6812,
        "longitude": 139.7671,
        "label": "東京"
      }
    }
  ]
}
```

#### アイテムの作成
```http
POST /api/collections/{collectionId}/items
Content-Type: application/json

{
  "title": "新しいアイテム",
  "description": "アイテムの説明",
  "isPublic": true,
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "width": 1920,
      "height": 1080
    }
  ]
}
```

#### アイテムの詳細取得
```http
GET /api/collections/{collectionId}/items/{itemId}
```

#### アイテムの更新
```http
PUT /api/collections/{collectionId}/items/{itemId}
Content-Type: application/json

{
  "title": "更新後のタイトル",
  "description": "更新後の説明",
  "isPublic": false,
  "location": {
    "latitude": 35.6812,
    "longitude": 139.7671,
    "label": "東京"
  },
  "metadata": {
    "attribution": "撮影者名",
    "rights": "CC BY 4.0",
    "customFields": [
      {
        "label": "作成年",
        "value": "2024"
      }
    ]
  }
}
```

#### アイテムの削除
```http
DELETE /api/collections/{collectionId}/items/{itemId}
```

### 画像アップロード

#### 画像のアップロード
```http
POST /api/upload
Content-Type: multipart/form-data

file: [画像ファイル]
```

**レスポンス例:**
```json
{
  "url": "https://storage.example.com/uploaded-image.jpg",
  "thumbnailUrl": "https://storage.example.com/thumb-image.jpg",
  "width": 1920,
  "height": 1080,
  "mimeType": "image/jpeg"
}
```

### IIIF関連

#### IIIF Manifest取得（コレクション）
```http
GET /api/iiif/collection/{collectionId}/manifest.json
```

#### IIIF Manifest取得（アイテム）
```http
GET /api/iiif/{userId}_{collectionId}_{itemId}/manifest.json
```

#### IIIF Image API info.json
```http
GET /api/iiif/image/{imageId}/info.json
```

## 認証トークン

### トークンの生成
```http
POST /api/collections/{collectionId}/items/{itemId}/tokens
Content-Type: application/json

{
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### トークンの検証
```http
GET /api/collections/{collectionId}/items/{itemId}?token={token}
```

## エラーレスポンス

APIは標準的なHTTPステータスコードを返します：

- `200 OK`: 成功
- `201 Created`: 作成成功
- `400 Bad Request`: リクエストエラー
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: アクセス権限なし
- `404 Not Found`: リソースが見つからない
- `500 Internal Server Error`: サーバーエラー

**エラーレスポンス例:**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "必須パラメータが不足しています",
    "details": {
      "missing": ["title"]
    }
  }
}
```

## レート制限

- 1分あたり60リクエストまで
- 1時間あたり1000リクエストまで
- 制限を超えると`429 Too Many Requests`が返される

## SDKとサンプルコード

### JavaScript/TypeScript

```javascript
// APIクライアントの初期化
const client = new CollectionAPI({
  apiKey: 'YOUR_API_KEY',
  secretKey: 'YOUR_SECRET_KEY',
  baseURL: 'https://api.example.com'
});

// コレクション一覧の取得
const collections = await client.getCollections();

// アイテムの作成
const newItem = await client.createItem(collectionId, {
  title: '新しいアイテム',
  description: '説明',
  images: [imageData]
});
```

### Python

```python
import requests

class CollectionAPI:
    def __init__(self, api_key, secret_key, base_url):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'X-API-Secret': secret_key
        }
    
    def get_collections(self):
        response = requests.get(
            f'{self.base_url}/api/collections',
            headers=self.headers
        )
        return response.json()
```

### cURL

```bash
# コレクション一覧の取得
curl -X GET "https://api.example.com/api/collections" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-API-Secret: YOUR_SECRET_KEY"

# アイテムの作成
curl -X POST "https://api.example.com/api/collections/{collectionId}/items" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-API-Secret: YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新しいアイテム",
    "description": "説明"
  }'
```

## Webhook

### Webhook設定

APIを通じてイベント通知を受け取ることができます：

```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["item.created", "item.updated", "item.deleted"]
}
```

### イベントタイプ

- `collection.created`: コレクション作成
- `collection.updated`: コレクション更新
- `collection.deleted`: コレクション削除
- `item.created`: アイテム作成
- `item.updated`: アイテム更新
- `item.deleted`: アイテム削除

### Webhookペイロード例

```json
{
  "event": "item.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "collectionId": "collection-id",
    "itemId": "item-id",
    "title": "新しいアイテム"
  }
}
```

## ベストプラクティス

1. **APIキーの管理**: 環境変数に保存し、コードに直接記載しない
2. **エラーハンドリング**: すべてのAPIコールでエラー処理を実装
3. **レート制限**: 429エラー時は指数バックオフで再試行
4. **キャッシング**: 頻繁にアクセスするデータはキャッシュ
5. **バッチ処理**: 大量のデータは分割して処理

## サポート

API関連の質問は、GitHubのIssueまたはAPIドキュメントをご確認ください。