# API Guide

## Overview

The Image Collection Manager provides a RESTful API for programmatic access to collections and items. This guide covers authentication, endpoints, and usage examples.

## Authentication

All API requests require authentication using API tokens.

### Getting Your API Token

1. Sign in to the application
2. Go to "API Auth Info" from the header menu
3. Generate or copy your API token
4. Use this token in the `Authorization` header of your requests

### Using the Token

Include your API token in all requests:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://your-domain.com/api/collections
```

## Collections API

### List Collections

Get all collections for the authenticated user.

```http
GET /api/collections
```

**Response:**
```json
{
  "collections": [
    {
      "id": "collection-id",
      "nameJa": "コレクション名",
      "nameEn": "Collection Name",
      "descriptionJa": "説明",
      "descriptionEn": "Description",
      "isPublic": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "itemCount": 5
    }
  ]
}
```

### Get Collection Details

Get detailed information about a specific collection.

```http
GET /api/collections/{collectionId}
```

**Response:**
```json
{
  "id": "collection-id",
  "nameJa": "コレクション名",
  "nameEn": "Collection Name",
  "descriptionJa": "説明",
  "descriptionEn": "Description",
  "isPublic": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "items": [...] // Array of items
}
```

### Create Collection

Create a new collection.

```http
POST /api/collections
Content-Type: application/json

{
  "nameJa": "新しいコレクション",
  "nameEn": "New Collection",
  "descriptionJa": "説明",
  "descriptionEn": "Description",
  "isPublic": true
}
```

### Update Collection

Update an existing collection.

```http
PUT /api/collections/{collectionId}
Content-Type: application/json

{
  "nameJa": "更新されたコレクション",
  "nameEn": "Updated Collection",
  "descriptionJa": "新しい説明",
  "descriptionEn": "New Description",
  "isPublic": false
}
```

### Delete Collection

Delete a collection and all its items.

```http
DELETE /api/collections/{collectionId}
```

## Items API

### List Items

Get all items in a collection.

```http
GET /api/collections/{collectionId}/items
```

### Get Item Details

Get detailed information about a specific item.

```http
GET /api/collections/{collectionId}/items/{itemId}
```

### Create Item

Add a new item to a collection.

```http
POST /api/collections/{collectionId}/items
Content-Type: application/json

{
  "label": {
    "ja": ["アイテム名"],
    "en": ["Item Name"]
  },
  "summary": {
    "ja": ["説明"],
    "en": ["Description"]
  },
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "width": 1000,
      "height": 800,
      "mimeType": "image/jpeg"
    }
  ],
  "isPublic": true
}
```

### Update Item

Update an existing item.

```http
PUT /api/collections/{collectionId}/items/{itemId}
Content-Type: application/json

{
  "label": {
    "ja": ["更新されたアイテム名"],
    "en": ["Updated Item Name"]
  },
  "summary": {
    "ja": ["新しい説明"],
    "en": ["New Description"]
  },
  "isPublic": true
}
```

### Delete Item

Delete an item from a collection.

```http
DELETE /api/collections/{collectionId}/items/{itemId}
```

## IIIF Manifest API

### Get Collection Manifest

Get the IIIF Presentation API v3 manifest for a collection.

```http
GET /api/collections/{collectionId}/iiif/manifest
```

**Response:** IIIF Presentation API v3 compliant JSON

### Get Item Manifest

Get the IIIF manifest for a specific item.

```http
GET /api/collections/{collectionId}/items/{itemId}/iiif/manifest
```

## IIIF Import API

### Import from URL

Import IIIF collections or manifests from external URLs.

```http
POST /api/iiif-info
Content-Type: application/json

{
  "url": "https://example.com/iiif/collection.json",
  "type": "collection"
}
```

**Response:**
```json
{
  "type": "collection",
  "label": "Collection Name",
  "manifests": [
    {
      "url": "https://example.com/manifest1.json",
      "label": "Item 1",
      "thumbnail": "https://example.com/thumb1.jpg"
    }
  ]
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a message:

```json
{
  "error": "Collection not found"
}
```

## Rate Limiting

The API has rate limiting to prevent abuse. Current limits:

- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## SDKs and Examples

### JavaScript/Node.js Example

```javascript
const API_TOKEN = 'your-api-token';
const BASE_URL = 'https://your-domain.com/api';

async function getCollections() {
  const response = await fetch(`${BASE_URL}/collections`, {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`
    }
  });
  return response.json();
}

async function createCollection(data) {
  const response = await fetch(`${BASE_URL}/collections`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

### Python Example

```python
import requests

API_TOKEN = 'your-api-token'
BASE_URL = 'https://your-domain.com/api'

headers = {
    'Authorization': f'Bearer {API_TOKEN}',
    'Content-Type': 'application/json'
}

def get_collections():
    response = requests.get(f'{BASE_URL}/collections', headers=headers)
    return response.json()

def create_collection(data):
    response = requests.post(f'{BASE_URL}/collections', 
                           headers=headers, json=data)
    return response.json()
```

## Webhooks

Set up webhooks to receive notifications when collections or items are updated:

```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["collection.created", "item.updated"]
}
```

Available events:
- `collection.created`
- `collection.updated`
- `collection.deleted`
- `item.created`
- `item.updated`
- `item.deleted`

## Best Practices

1. **Caching**: Cache responses when appropriate to reduce API calls
2. **Error Handling**: Always handle errors gracefully
3. **Rate Limiting**: Respect rate limits and implement backoff strategies
4. **Webhooks**: Use webhooks for real-time updates instead of polling
5. **Authentication**: Keep API tokens secure and rotate them regularly

## Support

For API support, please contact our development team or refer to the troubleshooting guide.