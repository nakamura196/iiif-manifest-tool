# IIIF Resource Types

This page explains the main resource types used in IIIF (International Image Interoperability Framework).

## Types of IIIF APIs

IIIF has two main APIs:

### 1. IIIF Image API
An API for delivering images themselves. It provides high-resolution images in various sizes and formats.

### 2. IIIF Presentation API
An API for describing image metadata and display methods. It manages multiple images together and defines how they should be displayed.

## info.json (IIIF Image API)

### Overview
- **Purpose**: Provides information about a single image
- **API**: IIIF Image API
- **Use**: Get image size, supported formats, tile information, etc.

### Structure Example
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

### URL Examples
- `https://example.com/iiif/image/abc123/info.json`
- `https://iiif.io/api/image/3.0/example/reference/918ecd18c2592080851777620de9bcb5-gottingen/info.json`

### Use Cases
- When you want to load high-resolution images progressively
- When zoom functionality is needed
- When you want to extract and display part of an image

## manifest.json (IIIF Presentation API)

### Overview
- **Purpose**: Represents a digital object with one or more images
- **API**: IIIF Presentation API
- **Use**: Book pages, scrolls, artworks with multiple views, etc.

### Structure Example
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

### URL Examples
- `https://api-iiif.db.kemco.keio.ac.jp/iiif/object/1004/2.1/manifest.json`
- `https://example.com/collection/item/123/manifest.json`

### Use Cases
- When displaying multi-page materials
- When complex layouts like spreads are needed
- When you want to include metadata (title, description, copyright info, etc.)
- When displaying in external viewers (Mirador, Universal Viewer, etc.)

## collection.json (IIIF Presentation API)

### Overview
- **Purpose**: Manages multiple manifests together
- **API**: IIIF Presentation API
- **Use**: Series, exhibitions, archives, etc.

### URL Examples
- `https://example.com/iiif/collection/top`
- `https://api-iiif.db.kemco.keio.ac.jp/iiif/collection/abc`

### Use Cases
- When grouping multiple works or items
- When representing collections with hierarchical structure

## How to Choose in This App

### When to Use info.json
✅ **Adding a single high-resolution image**
- Adding a single painting, photo, map, etc.
- Getting images directly from IIIF Image Server
- Want to utilize zoom functionality

**Example Input**: `https://example.com/iiif/image/abc123/info.json`

### When to Use manifest.json (Recommended)
✅ **Importing images from existing IIIF resources**
- Using IIIF images published by other institutions
- Want to import metadata together
- Selecting necessary pages from multi-page materials

**Example Input**: `https://api-iiif.db.kemco.keio.ac.jp/iiif/object/1004/2.1/manifest.json`

### When to Use collection.json
✅ **Batch importing large numbers of items**
- Importing entire series at once
- Adding multiple works at once

**Example Input**: `https://example.com/iiif/collection/series1`

## Frequently Asked Questions

### Q: What's the difference between info.json and manifest.json?
**A**:
- **info.json**: Information about a single image only (for image delivery)
- **manifest.json**: Image + metadata + display method (for presentation)

### Q: Which should I use?
**A**:
- **Need just a single image** → info.json
- **Want to manage with metadata** → manifest.json (Recommended)
- **Using IIIF resources from other institutions** → manifest.json

### Q: Why are multiple images imported from manifest.json?
**A**: A manifest.json can contain multiple pages (Canvas). Each Canvas corresponds to one image, so images equal to the number of pages are imported.

### Q: How to identify URLs?
**A**:
- `https://～/info.json` → info.json
- `https://～/manifest.json` → manifest.json
- `https://～/collection` → collection.json (may not have extension)

## Reference Links

- [IIIF Image API Specification](https://iiif.io/api/image/)
- [IIIF Presentation API Specification](https://iiif.io/api/presentation/)
- [IIIF Official Site](https://iiif.io/)

## Related Documentation

- [User Guide](user-guide.md) - How to add images
- [IIIF Integration Guide](iiif-integration.md) - Detailed technical information
