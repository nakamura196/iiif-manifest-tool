# Frequently Asked Questions

## Basic Usage

### What can this tool do?

This tool manages image collections and automatically generates IIIF (International Image Interoperability Framework) manifests. Created collections can be displayed in viewers such as Self Museum.

### Can I upload my own photos?

Yes, you can. Upload photos taken with your smartphone or image files (JPG, PNG, GIF, WebP) saved on your computer, and they will automatically be published as IIIF manifests. After uploading, you can add titles, descriptions, metadata, and more.

### What is the difference between a collection and an item?

A collection is like an "exhibition room" that groups multiple items (works). An item represents an individual work or image. You can add multiple items to one collection.

## About IIIF

### What is the difference between IIIF info.json and manifest URL?

**IIIF info.json** is an IIIF Image API endpoint that provides information about a single image (size, tile information, etc.) (e.g., https://example.com/iiif/image123/info.json).

**Manifest URL** is an IIIF Presentation API document that provides information about the entire work (title, description, multi-page images, etc.) (e.g., https://example.com/iiif/manifest.json).

To use a manifest URL, add it from the "IIIF Manifest" tab.

### Where can I get IIIF images?

Many museums, libraries, and galleries publish images in IIIF format. Examples include Keio University, National Diet Library Digital Collections, and the Metropolitan Museum of Art. Search for "IIIF" or "manifest.json" on their websites.

## Adding Images

### How many ways can I add images?

There are 5 ways:

1. **Upload** - Direct file upload
2. **From URL** - Enter image file URL
3. **IIIF info.json** - Enter IIIF Image API info.json URL
4. **IIIF Manifest** - Enter single IIIF manifest URL
5. **IIIF Collection** - Batch import multiple manifests

### What image formats are supported?

JPG, PNG, GIF, WebP, and TIFF formats are supported. You can upload up to 10MB per file.

### Can I change the order of images?

Yes, on the item edit page under the "Image Management" tab, you can change the order using the "Move Previous" and "Move Next" buttons for each image.

## Self Museum Integration

### Can I edit the text displayed in Self Museum?

Yes, you can. Edit using the following methods:

#### Exhibition Room Title

1. Display collection list on Dashboard
2. Click the "⋮" (menu) button on the collection card
3. Select "Collection Settings" from the menu
4. Edit Japanese and English titles in the Basic Information section
5. Click the "Save" button at the top right

* Note: Self Museum displays only the exhibition room title. The description field is for management within this tool.

#### Individual Item Descriptions

Edit information for individual items (works) within a collection:

- Open an item and click "Edit"
- Edit title and description in the "Basic Information" tab
- Add custom fields in the "Metadata" tab

### How long does it take to appear in Self Museum?

Changes are reflected immediately after saving. Make sure your collection is set to "Public". Click the "View in Self Museum" button on the Dashboard to see the current state.

## API & Technical Questions

### Can I access from external sources using the API?

Yes, you can. Public collections are provided in IIIF Presentation API v3 format. API endpoints are in the following format:

- Collection list: `/api/iiif/3/[userId]/collections/collection.json`
- Individual manifest: `/api/iiif/3/[userId]/[collectionId]/[itemId]/manifest.json`

See the "API Authentication Info" page for details.

### Can I add location information?

Yes, you can. On the item edit page under the "Location" tab, you can click on the map to set latitude and longitude. Location information is output as the navPlace field in the IIIF manifest.

### What is the georeferencing feature?

Georeferencing is a feature that maps coordinates on images (such as old maps) to actual geographic coordinates. On the item edit page under the "Georeferencing" tab, you can import CSV files to register multiple points at once. Output is in IIIF Georeferencing Extension format.
