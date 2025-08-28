# User Guide

## Collection Management

### Creating Collections

1. Click the "New Collection" button on the dashboard
2. Enter required information:
   - **Collection Name** (Required): Choose a descriptive name
   - **Description** (Optional): Describe the collection contents
   - **Visibility**: Select public/private
3. Click "Create"

### Editing Collections

1. From the collections list, click the "⋮" menu for the collection you want to edit
2. Select "Edit"
3. Update information and click "Save"

### Deleting Collections

1. From the collections list, click the "⋮" menu for the collection you want to delete
2. Select "Delete"
3. Click "Delete" in the confirmation dialog

⚠️ **Warning**: Deleting a collection will also delete all items it contains

## Item (Image) Management

### Adding Items

#### Method 1: Drag & Drop

1. Open a collection page
2. Click the "New Item" button
3. Drop image files into the drag & drop area
4. Enter title and description
5. Click "Create and Edit"

#### Method 2: File Selection

1. Click the "Select Files" button
2. Select image(s) to upload (multiple selection supported)
3. Enter title and description
4. Click "Create and Edit"

#### Method 3: Add from URL

1. Select the "Add from URL" tab
2. Enter the image URL
3. Click "Add"

#### Method 4: Adding IIIF Images

1. Select the "Add from info.json" tab
2. Enter the IIIF info.json URL
3. Click "Add"

### Editing Items

1. Click on the item you want to edit from the items list
2. Update the following information in the edit screen:
   - **Basic Information**: Title, description, visibility settings
   - **Location Information**: Latitude, longitude, place name
   - **Details**: Attribution, rights information
   - **Additional Information**: Custom fields (creation year, author, etc.)
3. Click "Save"

### IIIF Collection Registration

You can import and manage external IIIF collections or manifests as new collections.

#### How to Add IIIF Collections

1. Click the "New Collection" button on the dashboard
2. Enter basic collection information (name and description)
3. Select "IIIF Import" in the "Import Mode"
4. Enter the IIIF collection or manifest URL
5. Click the "Fetch" button to retrieve content
6. Review the preview (title, number of items, thumbnails, etc.)
7. If everything looks correct, click the "Create" button

#### Supported IIIF Formats

- **IIIF Presentation API v3**: Recommended format
- **IIIF Presentation API v2**: Automatically converted to v3
- **IIIF Collection**: Collections containing multiple manifests
- **IIIF Manifest**: Single manifest (treated as a collection)

#### Import Processing

- **Metadata Preservation**: All metadata including titles, descriptions, and custom fields are preserved
- **Multilingual Support**: Both Japanese (ja) and English (en) information is automatically imported
- **Image References**: Image data is referenced from the original IIIF server (not copied)
- **Rights Information**: License, attribution, and provider information are also preserved
- **Multi-line Descriptions**: Multi-line descriptions (summary) from IIIF manifests are preserved as arrays

### Reordering Items

1. Drag an image on the collection page
2. Drop it at the desired position
3. Changes are saved automatically

### Deleting Items

1. Open the item edit screen
2. Click the "Delete" button
3. Confirm deletion in the confirmation dialog

## Display Modes

### Grid View

- Default display mode
- Shows images as thumbnail list
- Displays each item's title and public status

### Map View

1. Select "Map" in the display toggle
2. Items with location information are displayed on the map
3. Click markers to view details

## Publishing and Sharing

### Visibility Settings

#### Collection Level
- **Public**: Accessible to everyone
- **Private**: Only logged-in users

#### Item Level
- **Public**: Viewable by anyone when collection is public
- **Private**: Only viewable by owner
- **Limited**: Only users with authentication token

### Sharing Methods

#### 1. Direct Link Sharing

1. Copy the collection or item URL
2. Share via email or social media

#### 2. Limited Sharing with Authentication Token

1. Click the "Auth Key" button for the item
2. Generate a token
3. Share the URL with token

#### 3. IIIF Manifest Sharing

1. Click the "IIIF" button on the collection page
2. Copy the Manifest URL
3. Open in IIIF-compatible viewers

#### 4. Publishing with Self Museum

1. Click the "Self Museum" button on the collection page
2. View the published page on Self Museum

## Search and Filtering

### Dashboard Search

1. Enter keywords in the search bar
2. Searches collection names and descriptions
3. Press Enter or click the search icon

### Filtering

- Filter by public/private status
- Sort by creation date/update date

## Using Viewers

### Mirador Viewer

1. Click "Open in Mirador" for an item
2. Advanced viewer opens
3. Available features:
   - Zoom/Pan
   - Full screen display
   - Image comparison
   - Annotations

### OpenSeadragon Viewer

1. Automatically displayed on item detail pages
2. Zoom with mouse wheel
3. Drag to move

## Data Export

### IIIF Manifest

1. Click the "IIIF" button on the collection page
2. Download Manifest in JSON format

### Image Download

1. Open item detail page
2. Right-click on image
3. Select "Save image"

## Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save edits
- `Esc`: Close modal
- `←/→`: Navigate between items (in detail view)

## IIIF Collection Usage Examples

### Example 1: National Diet Library Digital Collections

Importing IIIF manifests from the National Diet Library:

1. Click "New Collection" on the dashboard
2. Enter a URL like:
   ```
   https://www.dl.ndl.go.jp/api/iiif/1234567/manifest.json
   ```
3. Review content in preview
4. Click "Import"

### Example 2: University of Tokyo Digital Archive

Importing classical book collections from the University of Tokyo:

1. Click "IIIF Import"
2. Enter collection URL
3. If multiple manifests are included, all can be imported in batch

### Example 3: Integrating Collections from Multiple Institutions

Combine IIIF resources from different institutions into one collection:

1. Create a new collection
2. Add IIIF manifests from various institutions via URL
3. Add custom metadata and descriptions
4. Publish as an integrated collection

## Tips and Tricks

1. **Bulk Upload**: Select multiple files for upload at once
2. **Bulk Metadata Editing**: Select multiple items for batch updates
3. **Template Usage**: Create templates for commonly used metadata
4. **Backup**: Regularly export important data
5. **IIIF Collection Updates**: Periodically re-sync external IIIF resources to maintain current status

## Troubleshooting

If you encounter issues, please refer to the [Troubleshooting Guide](troubleshooting.md).