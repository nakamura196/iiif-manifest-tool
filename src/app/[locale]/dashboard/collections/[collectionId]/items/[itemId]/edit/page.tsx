'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FiArrowLeft, FiSave, FiTrash2, FiPlus, FiSettings, FiImage, FiMapPin, FiInfo, FiLock, FiLoader, FiTarget, FiUpload, FiDownload, FiX } from 'react-icons/fi';
import ImageUploader from '@/components/ImageUploader';
import ImageAccessControl from '@/components/ImageAccessControl';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import for map component to avoid SSR issues
const ItemLocationMap = dynamic(() => import('@/components/ItemLocationMap'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">Loading map...</div>
});

interface ItemEditPageProps {
  params: Promise<{
    locale: string;
    collectionId: string;
    itemId: string;
  }>;
}

interface MetadataField {
  label: string;
  value: string;
}

interface ManifestMetadata {
  attribution?: string;
  rights?: string;
  requiredStatement?: {
    label: { [key: string]: string[] };
    value: { [key: string]: string[] };
  };
  homepage?: Array<{
    id: string;
    type: string;
    label?: { [key: string]: string[] };
  }>;
  seeAlso?: Array<{
    id: string;
    type: string;
    format?: string;
    label?: { [key: string]: string[] };
  }>;
  provider?: Array<{
    id?: string;
    type: string;
    label?: { [key: string]: string[] };
  }>;
  customFields?: MetadataField[];
}

interface ImageData {
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  mimeType?: string;
  infoJson?: string;
  isIIIF?: boolean;
  iiifBaseUrl?: string;
  access?: {
    isPublic: boolean;
    allowedUsers: string[];
  };
}

interface GeoPoint {
  id?: string;
  resourceCoords: [number, number];
  coordinates: [number, number];
  label?: string;
  tags?: string[];
  url?: string;
  xywh?: string;
}

interface GeoAnnotation {
  points: GeoPoint[];
  transformationType?: 'polynomial' | 'thin-plate-spline';
  transformationOrder?: number;
}

export default function ItemEditPage({ params }: ItemEditPageProps) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState<ImageData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [metadata, setMetadata] = useState<ManifestMetadata>({});
  const [showAccessControl, setShowAccessControl] = useState(false);
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'additional' | 'location' | 'annotations' | 'settings'>('basic');
  const [geoAnnotations, setGeoAnnotations] = useState<{ [key: number]: GeoAnnotation }>({});
  const [csvInput, setCsvInput] = useState<{ [key: number]: string }>({});
  const [showCsvImport, setShowCsvImport] = useState<{ [key: number]: boolean }>({});

  const fetchItem = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items/${resolvedParams.itemId}`);
      if (response.ok) {
        const data = await response.json();
        setTitle(data.title || '');
        setDescription(data.description || '');
        setIsPublic(data.isPublic !== undefined ? data.isPublic : true);
        setImages(data.images || []);
        setMetadata(data.metadata || {});
        if (data.geoAnnotations) {
          setGeoAnnotations(data.geoAnnotations);
        }
        if (data.location) {
          setLatitude(data.location.latitude?.toString() || '');
          setLongitude(data.location.longitude?.toString() || '');
          setLocationLabel(data.location.label || '');
        }
      } else {
        console.error('Failed to fetch item:', response.status);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.collectionId, resolvedParams.itemId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchItem();
    } else if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, fetchItem, router]);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        return response.json();
      }
      throw new Error('Upload failed');
    });

    try {
      const results = await Promise.all(uploadPromises);
      setImages([...images, ...results]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlAdd = async (url: string) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      const img = new Image();
      img.onload = () => {
        setImages([
          ...images,
          {
            url,
            width: img.width,
            height: img.height,
            mimeType: contentType,
          },
        ]);
      };
      img.src = url;
    } catch (error) {
      console.error('Error adding URL:', error);
    }
  };

  const handleInfoJsonAdd = async (infoJsonUrl: string) => {
    try {
      const response = await fetch(infoJsonUrl);
      const infoJson = await response.json();
      
      const baseUrl = infoJson.id || infoJson['@id'];
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      
      // Full size image URL
      const imageUrl = `${cleanBaseUrl}/full/full/0/default.jpg`;
      
      // Generate thumbnail URL with appropriate size
      let thumbnailUrl = imageUrl; // Default to full size
      if (infoJson.sizes && infoJson.sizes.length > 0) {
        // Find a suitable thumbnail size (around 400px width)
        const thumbnailSize = infoJson.sizes.find((size: {width: number; height: number}) => 
          size.width >= 400 && size.width <= 800
        );
        
        if (thumbnailSize) {
          // Use specific width AND height from sizes array
          thumbnailUrl = `${cleanBaseUrl}/full/${thumbnailSize.width},${thumbnailSize.height}/0/default.jpg`;
        } else {
          // If no suitable size in range, find the largest available size
          // Sort sizes by width to ensure we get the largest
          const sortedSizes = [...infoJson.sizes].sort((a, b) => b.width - a.width);
          const largestSize = sortedSizes[0];
          if (largestSize) {
            thumbnailUrl = `${cleanBaseUrl}/full/${largestSize.width},${largestSize.height}/0/default.jpg`;
          } else {
            // Fallback to a small fixed size
            thumbnailUrl = `${cleanBaseUrl}/full/400,/0/default.jpg`;
          }
        }
      } else if (infoJson.width) {
        // If no sizes array but width is available, calculate proportional thumbnail
        const targetWidth = Math.min(400, infoJson.width);
        thumbnailUrl = `${cleanBaseUrl}/full/${targetWidth},/0/default.jpg`;
      }
      
      setImages([
        ...images,
        {
          url: imageUrl,
          thumbnailUrl: thumbnailUrl,
          width: infoJson.width,
          height: infoJson.height,
          mimeType: 'image/jpeg',
          infoJson: JSON.stringify(infoJson),
          isIIIF: true,
          iiifBaseUrl: cleanBaseUrl
        },
      ]);
    } catch (error) {
      console.error('Error adding info.json:', error);
    }
  };

  const handleImageAccessChange = (index: number, access: { isPublic: boolean; allowedUsers: string[] }) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], access };
    setImages(newImages);
  };

  const handleSave = async () => {
    if (!title || images.length === 0) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${resolvedParams.collectionId}/items/${resolvedParams.itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          images,
          isPublic,
          metadata,
          canvasAccess: images.map(img => img.access || { isPublic: true, allowedUsers: [] }),
          geoAnnotations,
          location: (latitude && longitude) ? {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            label: locationLabel || title
          } : undefined
        }),
      });

      if (response.ok) {
        setSnackbar({ show: true, message: t('ItemEditPage.saveSuccess'), type: 'success' });
        setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
      } else {
        setSnackbar({ show: true, message: t('ItemEditPage.saveError'), type: 'error' });
        setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < images.length) {
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      setImages(newImages);
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
  };

  // Helper function to parse CSV line properly handling quoted values
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  };

  const parseCsvAnnotations = (csvText: string): GeoPoint[] => {
    const lines = csvText.trim().split('\n');
    const points: GeoPoint[] = [];
    
    if (lines.length === 0) return points;
    
    // Try to detect header row and column indices
    let columnIndices: {
      id?: number;
      x?: number;
      y?: number;
      lat?: number;
      lng?: number;
      label?: number;
      tags?: number;
      url?: number;
      xywh?: number;
    } = {};
    
    let dataStartLine = 0;
    
    // Check if first line is a header
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('x') || firstLine.includes('lat') || firstLine.includes('id')) {
      const headerRow = parseCsvLine(lines[0]).map(h => h.toLowerCase());
      
      // Map column names to indices
      headerRow.forEach((col, idx) => {
        if (col === 'id') columnIndices.id = idx;
        else if (col === 'x') columnIndices.x = idx;
        else if (col === 'y') columnIndices.y = idx;
        // Skip w and h columns - they're not needed for georeferencing
        else if (col === 'w' || col === 'width' || col === 'h' || col === 'height') {
          // Intentionally skip these columns
        }
        else if (col === 'latitude' || col === 'lat') columnIndices.lat = idx;
        else if (col === 'longitude' || col === 'lng' || col === 'lon') columnIndices.lng = idx;
        else if (col === 'label' || col === 'name') columnIndices.label = idx;
        else if (col === 'tags' || col === 'tag') columnIndices.tags = idx;
        else if (col === 'url' || col === 'link') columnIndices.url = idx;
        else if (col === 'xywh' || col === 'region') columnIndices.xywh = idx;
      });
      
      dataStartLine = 1; // Skip header row
    }
    
    // If no header was detected or essential columns are missing, try to infer from data
    if (columnIndices.x === undefined || columnIndices.y === undefined || 
        columnIndices.lat === undefined || columnIndices.lng === undefined) {
      // Reset and try positional parsing
      columnIndices = {};
      dataStartLine = 0;
      
      // Check first data line to infer format
      if (lines.length > 0) {
        const testParts = parseCsvLine(lines[0]);
        let offset = 0;
        
        // Check if first column looks like an ID
        if (testParts.length >= 5 && (isNaN(parseFloat(testParts[0])) || testParts[0].includes('point'))) {
          columnIndices.id = 0;
          offset = 1;
        }
        
        // Try to find numeric columns for coordinates
        const numericCols: { index: number; value: number }[] = [];
        for (let i = offset; i < testParts.length; i++) {
          const val = parseFloat(testParts[i]);
          if (!isNaN(val)) {
            numericCols.push({ index: i, value: val });
          }
        }
        
        // Need at least 4 numeric columns
        if (numericCols.length >= 4) {
          // Heuristic: coordinates usually come in pairs
          // x,y are image coordinates (usually large numbers > 100)
          // lat,lng are geographic coordinates (lat: -90 to 90, lng: -180 to 180)
          
          let xyFound = false;
          let latLngFound = false;
          
          // Look for x,y pair (both usually > 100)
          for (let i = 0; i < numericCols.length - 1; i++) {
            if (!xyFound && numericCols[i].value > 100 && numericCols[i + 1].value > 100) {
              columnIndices.x = numericCols[i].index;
              columnIndices.y = numericCols[i + 1].index;
              xyFound = true;
              
              // Look for lat,lng after x,y
              for (let j = i + 2; j < numericCols.length - 1; j++) {
                const possibleLat = numericCols[j].value;
                const possibleLng = numericCols[j + 1].value;
                
                // Check if values are in geographic range
                if (Math.abs(possibleLat) <= 90 && Math.abs(possibleLng) <= 180) {
                  columnIndices.lat = numericCols[j].index;
                  columnIndices.lng = numericCols[j + 1].index;
                  latLngFound = true;
                  break;
                }
              }
              
              if (latLngFound) break;
            }
          }
          
          // If we found lat/lng, assign remaining text columns
          if (columnIndices.lng !== undefined) {
            const nextCol = columnIndices.lng + 1;
            if (testParts.length > nextCol && testParts[nextCol]) columnIndices.label = nextCol;
            if (testParts.length > nextCol + 1 && testParts[nextCol + 1]) columnIndices.tags = nextCol + 1;
            if (testParts.length > nextCol + 2 && testParts[nextCol + 2]) columnIndices.url = nextCol + 2;
            if (testParts.length > nextCol + 3 && testParts[nextCol + 3]) columnIndices.xywh = nextCol + 3;
          }
        }
      }
    }
    
    // Process data lines
    for (let lineIdx = dataStartLine; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      if (!line.trim()) continue;
      
      // Skip comments
      if (line.startsWith('#')) continue;
      
      const parts = parseCsvLine(line);
      
      // Extract values using detected column indices
      const x = columnIndices.x !== undefined ? parseFloat(parts[columnIndices.x]) : NaN;
      const y = columnIndices.y !== undefined ? parseFloat(parts[columnIndices.y]) : NaN;
      const lat = columnIndices.lat !== undefined ? parseFloat(parts[columnIndices.lat]) : NaN;
      const lng = columnIndices.lng !== undefined ? parseFloat(parts[columnIndices.lng]) : NaN;
      
      if (!isNaN(x) && !isNaN(y) && !isNaN(lat) && !isNaN(lng)) {
        const point: GeoPoint = {
          resourceCoords: [x, y],
          coordinates: [lng, lat] // GeoJSON uses [lng, lat]
        };
        
        // Add optional fields if columns exist and have values
        if (columnIndices.id !== undefined && parts[columnIndices.id]) {
          point.id = parts[columnIndices.id];
        }
        
        if (columnIndices.label !== undefined && parts[columnIndices.label]) {
          point.label = parts[columnIndices.label];
        }
        
        if (columnIndices.tags !== undefined && parts[columnIndices.tags]) {
          point.tags = parts[columnIndices.tags].split(';').filter(t => t.trim());
        }
        
        if (columnIndices.url !== undefined && parts[columnIndices.url]) {
          point.url = parts[columnIndices.url];
        }
        
        if (columnIndices.xywh !== undefined && parts[columnIndices.xywh]) {
          point.xywh = parts[columnIndices.xywh];
        }
        
        points.push(point);
      }
    }
    
    return points;
  };

  const handleCsvImport = (imageIndex: number) => {
    const csvText = csvInput[imageIndex];
    if (!csvText) return;
    
    const points = parseCsvAnnotations(csvText);
    if (points.length > 0) {
      setGeoAnnotations({
        ...geoAnnotations,
        [imageIndex]: {
          points,
          transformationType: 'polynomial',
          transformationOrder: 1
        }
      });
      setShowCsvImport({ ...showCsvImport, [imageIndex]: false });
      setCsvInput({ ...csvInput, [imageIndex]: '' });
    }
  };

  const exportAnnotationsAsCsv = (imageIndex: number) => {
    const annotation = geoAnnotations[imageIndex];
    if (!annotation || annotation.points.length === 0) return;
    
    let csv = 'id,x,y,latitude,longitude,label,tags,url,xywh\n';
    annotation.points.forEach((point, idx) => {
      const pointId = point.id || `point_${idx + 1}`;
      csv += `${pointId},${point.resourceCoords[0]},${point.resourceCoords[1]},`;
      csv += `${point.coordinates[1]},${point.coordinates[0]}`;
      csv += `,${point.label || ''}`;
      csv += `,${point.tags?.join(';') || ''}`;
      csv += `,${point.url || ''}`;
      csv += `,${point.xywh || ''}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations-image-${imageIndex + 1}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCsvTemplate = () => {
    const template = `id,x,y,latitude,longitude,label,tags,url,xywh
# CSVテンプレート - 画像座標と地理座標のマッピング
# 各行は1つのポイントを表します
# 
# フィールド説明:
# id: ポイントの識別子（オプション、例: point_1, 電気実験室, など）
# x: 画像上のX座標（ピクセル）※必須
# y: 画像上のY座標（ピクセル）※必須
# latitude: 緯度（10進数）※必須
# longitude: 経度（10進数）※必須
# label: ポイントのラベル（例: 東京大学本館）
# tags: タグ（セミコロン区切り、例: 建物;歴史的建造物）
# url: 関連URL（例: https://example.com）
# xywh: 画像上の領域（x,y,width,height形式）
# 
# サンプルデータ:
point_1,100,200,35.6762,139.6503,東京タワー,ランドマーク;観光地,https://www.tokyotower.co.jp,100,200,50,100
point_2,300,400,35.6585,139.7454,東京スカイツリー,ランドマーク;展望台,https://www.tokyo-skytree.jp,300,400,60,120
point_3,500,600,35.7151,139.7623,東京大学,大学;教育機関,https://www.u-tokyo.ac.jp,500,600,80,80`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'georeferencing-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCsvSample = () => {
    const sample = `id,x,y,latitude,longitude,label,tags,url,xywh
電気実験室,6690,7517,35.7151233,139.7623182,電気実験室,工学部,https://maps.app.goo.gl/dJdXXQEA8dWSptgt8,5936,6344,976,1384
法文経第二,8846,9181,35.7129321,139.7612649,法文経教室　第二号館,法学部;文学部;経済学部,,
医学部第二,11626,8624,35.7109037,139.7622949,医学部　第二号館,医学部,,
point_4,12761,9476,35.7097492,139.7618816,,,, 
point_5,7540,8365,35.7143244,139.7618343,,,,
point_6,10681,5983,35.7123118,139.764372,,,,
point_7,9304,5659,35.7135689,139.7645652,,,,
point_8,3826,10219,35.7166753,139.7594158,,,,
point_9,8044,9859,35.7134203,139.76062,,,,
point_10,10517,7862,35.7121183,139.7627108,,,,`;
    
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'georeferencing-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeAnnotationPoint = (imageIndex: number, pointIndex: number) => {
    const annotation = geoAnnotations[imageIndex];
    if (!annotation) return;
    
    const newPoints = annotation.points.filter((_, i) => i !== pointIndex);
    if (newPoints.length > 0) {
      setGeoAnnotations({
        ...geoAnnotations,
        [imageIndex]: { ...annotation, points: newPoints }
      });
    } else {
      const newAnnotations = { ...geoAnnotations };
      delete newAnnotations[imageIndex];
      setGeoAnnotations(newAnnotations);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('ItemEditPage.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/${resolvedParams.locale}/dashboard/collections/${resolvedParams.collectionId}`}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiArrowLeft className="text-xl" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">{t('ItemEditPage.title')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!title || images.length === 0 || saving || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                {saving ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiSave />
                )}
                <span className="hidden sm:inline">{saving ? t('ItemEditPage.saving') : t('ItemEditPage.save')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sticky top-20">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'basic'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiInfo className="text-lg" />
                  <span>{t('ItemEditPage.basicInfo')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('images')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'images'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiImage className="text-lg" />
                  <span>{t('ItemEditPage.imageManagement')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('additional')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'additional'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiPlus className="text-lg" />
                  <span>{t('ItemEditPage.additionalInfo')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('location')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'location'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiMapPin className="text-lg" />
                  <span>{t('ItemEditPage.location')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('annotations')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'annotations'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiTarget className="text-lg" />
                  <span>{t('ItemEditPage.annotations')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <FiSettings className="text-lg" />
                  <span>{t('ItemEditPage.detailedSettings')}</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'basic' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiInfo />
                  {t('ItemEditPage.basicInfo')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('ItemEditPage.itemTitle')} *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder={t('ItemEditPage.itemTitlePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('ItemEditPage.description')}</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      rows={5}
                      placeholder={t('ItemEditPage.descriptionPlaceholder')}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isPublic" className="flex items-center gap-2">
                      {isPublic ? <FiLock className="text-green-500" /> : <FiLock className="text-gray-400" />}
                      {t('ItemEditPage.makePublic')}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="space-y-6">
                {/* Current Images */}
                {images.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FiImage />
                      {t('ItemEditPage.currentImages')} ({images.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.map((img, index) => (
                        <div key={index} className="space-y-2">
                          <div className="relative">
                            <img
                              src={img.thumbnailUrl || (img.isIIIF && img.iiifBaseUrl ? `${img.iiifBaseUrl}/full/400,/0/default.jpg` : img.url)}
                              alt={`Image ${index + 1}`}
                              className="w-full h-40 object-cover rounded-lg"
                            />
                            <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                              {index + 1}
                            </div>
                          </div>
                          {/* Controls below image for mobile */}
                          <div className="flex justify-center gap-2">
                            {index > 0 && (
                              <button
                                onClick={() => moveImage(index, 'up')}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                title={t('ItemEditPage.movePrevious')}
                              >
                                ←
                              </button>
                            )}
                            <button
                              onClick={() => removeImage(index)}
                              className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                              title={t('ItemEditPage.delete')}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                            {index < images.length - 1 && (
                              <button
                                onClick={() => moveImage(index, 'down')}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                title={t('ItemEditPage.moveNext')}
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Uploader */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('ItemEditPage.addNewImages')}</h3>
                  <ImageUploader
                    onUpload={handleUpload}
                    onUrlAdd={handleUrlAdd}
                    onInfoJsonAdd={handleInfoJsonAdd}
                  />
                </div>

                {/* Access Control */}
                {!isPublic && images.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <button
                      onClick={() => setShowAccessControl(!showAccessControl)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800"
                    >
                      <FiSettings />
                      {t('ItemEditPage.imageAccessSettings')}
                    </button>
                    
                    {showAccessControl && (
                      <div className="mt-4">
                        <ImageAccessControl
                          images={images}
                          onChange={handleImageAccessChange}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'additional' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiPlus />
                  {t('ItemEditPage.additionalInfo')}
                </h2>
                <div className="space-y-4">
                  <div className="space-y-3">
                    {metadata.customFields?.map((field, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const newFields = [...(metadata.customFields || [])];
                            newFields[index].label = e.target.value;
                            setMetadata({ ...metadata, customFields: newFields });
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder={t('ItemEditPage.fieldLabel')}
                        />
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => {
                            const newFields = [...(metadata.customFields || [])];
                            newFields[index].value = e.target.value;
                            setMetadata({ ...metadata, customFields: newFields });
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                          placeholder={t('ItemEditPage.fieldValue')}
                        />
                        <button
                          onClick={() => {
                            const newFields = metadata.customFields?.filter((_, i) => i !== index) || [];
                            setMetadata({ ...metadata, customFields: newFields });
                          }}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg shrink-0"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newFields = [...(metadata.customFields || []), { label: '', value: '' }];
                        setMetadata({ ...metadata, customFields: newFields });
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                    >
                      <FiPlus />
                      {t('ItemEditPage.addInfo')}
                    </button>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('ItemEditPage.additionalInfoNote')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'location' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiMapPin />
                  {t('ItemEditPage.location')}
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('ItemEditPage.latitude')}</label>
                      <input
                        type="text"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder={t('ItemEditPage.latitudePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('ItemEditPage.longitude')}</label>
                      <input
                        type="text"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder={t('ItemEditPage.longitudePlaceholder')}
                      />
                    </div>
                  </div>
                  {(latitude || longitude) && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setLatitude('');
                          setLongitude('');
                          setLocationLabel('');
                        }}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        {t('ItemEditPage.clearLocation')}
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('ItemEditPage.locationName')}</label>
                    <input
                      type="text"
                      value={locationLabel}
                      onChange={(e) => setLocationLabel(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder={t('ItemEditPage.locationNamePlaceholder')}
                    />
                  </div>
                  <div className="h-96 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <ItemLocationMap
                      latitude={latitude ? parseFloat(latitude) : 35.6762}
                      longitude={longitude ? parseFloat(longitude) : 139.6503}
                      label={locationLabel || title}
                      onChange={handleLocationChange}
                      showDefault={!latitude || !longitude}
                    />
                  </div>
                  {(!latitude || !longitude) && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {t('ItemEditPage.clickMapToSetLocation')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'annotations' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <FiTarget />
                    {t('ItemEditPage.georeferencing')}
                  </h2>
                  
                  {images.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('ItemEditPage.addImagesFirst')}
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {images.map((image, imageIndex) => (
                        <div key={imageIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start gap-4 mb-4">
                            <img
                              src={image.isIIIF && image.iiifBaseUrl ? `${image.iiifBaseUrl}/full/100,/0/default.jpg` : image.url}
                              alt={`Image ${imageIndex + 1}`}
                              className="w-20 h-20 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h3 className="font-medium mb-2">
                                {t('ItemEditPage.image')} {imageIndex + 1}
                                {geoAnnotations[imageIndex] && (
                                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                                    ({geoAnnotations[imageIndex].points.length} {t('ItemEditPage.points')})
                                  </span>
                                )}
                              </h3>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setShowCsvImport({ ...showCsvImport, [imageIndex]: !showCsvImport[imageIndex] })}
                                  className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                  <FiUpload />
                                  {t('ItemEditPage.importCsv')}
                                </button>
                                
                                {geoAnnotations[imageIndex] && (
                                  <button
                                    onClick={() => exportAnnotationsAsCsv(imageIndex)}
                                    className="flex items-center gap-1 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                  >
                                    <FiDownload />
                                    {t('ItemEditPage.exportCsv')}
                                  </button>
                                )}
                                
                                {geoAnnotations[imageIndex] && (
                                  <button
                                    onClick={() => {
                                      const newAnnotations = { ...geoAnnotations };
                                      delete newAnnotations[imageIndex];
                                      setGeoAnnotations(newAnnotations);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                                  >
                                    <FiTrash2 />
                                    {t('ItemEditPage.clearAll')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {showCsvImport[imageIndex] && (
                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {t('ItemEditPage.csvFormat')}: id,x,y,latitude,longitude,label,tags,url,xywh
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={downloadCsvTemplate}
                                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                  >
                                    <FiDownload className="inline mr-1" />
                                    {t('ItemEditPage.downloadTemplate')}
                                  </button>
                                  <button
                                    onClick={downloadCsvSample}
                                    className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                  >
                                    <FiDownload className="inline mr-1" />
                                    {t('ItemEditPage.downloadSample')}
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={csvInput[imageIndex] || ''}
                                onChange={(e) => setCsvInput({ ...csvInput, [imageIndex]: e.target.value })}
                                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-600 font-mono text-sm"
                                rows={8}
                                placeholder="電気実験室,6690,7517,35.7151233,139.7623182,電気実験室,工学部,https://maps.app.goo.gl/...,5936,6344,976,1384"
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleCsvImport(imageIndex)}
                                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                  {t('ItemEditPage.import')}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowCsvImport({ ...showCsvImport, [imageIndex]: false });
                                    setCsvInput({ ...csvInput, [imageIndex]: '' });
                                  }}
                                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                  {t('ItemEditPage.cancel')}
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {geoAnnotations[imageIndex] && geoAnnotations[imageIndex].points.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('ItemEditPage.annotationPoints')}:
                              </h4>
                              <div className="max-h-60 overflow-y-auto space-y-2">
                                {geoAnnotations[imageIndex].points.map((point, pointIndex) => (
                                  <div key={pointIndex} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                                    <div className="flex-1">
                                      <span className="font-mono">
                                        [{point.resourceCoords[0]}, {point.resourceCoords[1]}] → 
                                        [{point.coordinates[1].toFixed(6)}, {point.coordinates[0].toFixed(6)}]
                                      </span>
                                      {point.label && (
                                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                                          {point.label}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => removeAnnotationPoint(imageIndex, pointIndex)}
                                      className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                    >
                                      <FiX />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    {t('ItemEditPage.aboutGeoref')}
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t('ItemEditPage.georefDescription')}
                  </p>
                  <a
                    href="https://iiif.io/api/extension/georef/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                  >
                    {t('ItemEditPage.learnMore')} →
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiSettings />
                  {t('ItemEditPage.detailedSettings')}
                </h2>
                <div className="space-y-4">
                  {/* Attribution */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('ItemEditPage.attribution')}
                    </label>
                    <input
                      type="text"
                      value={metadata.attribution || ''}
                      onChange={(e) => setMetadata({ ...metadata, attribution: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder={t('ItemEditPage.attributionPlaceholder')}
                    />
                  </div>

                  {/* Rights */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('ItemEditPage.license')}
                    </label>
                    <input
                      type="text"
                      value={metadata.rights || ''}
                      onChange={(e) => setMetadata({ ...metadata, rights: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      placeholder={t('ItemEditPage.licensePlaceholder')}
                    />
                  </div>

                  {/* Required Statement */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('ItemEditPage.usageTerms')}
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={metadata.requiredStatement?.label?.ja?.[0] || ''}
                        onChange={(e) => {
                          const currentStatement = metadata.requiredStatement || {
                            label: { ja: [] },
                            value: { ja: [] }
                          };
                          setMetadata({
                            ...metadata,
                            requiredStatement: {
                              ...currentStatement,
                              label: { ja: [e.target.value] }
                            }
                          });
                        }}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        placeholder={t('ItemEditPage.usageTermsLabel')}
                      />
                      <textarea
                        value={metadata.requiredStatement?.value?.ja?.[0] || ''}
                        onChange={(e) => {
                          const currentStatement = metadata.requiredStatement || {
                            label: { ja: [] },
                            value: { ja: [] }
                          };
                          setMetadata({
                            ...metadata,
                            requiredStatement: {
                              ...currentStatement,
                              value: { ja: [e.target.value] }
                            }
                          });
                        }}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                        rows={3}
                        placeholder={t('ItemEditPage.usageTermsDescription')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Snackbar */}
      {snackbar.show && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transition-all transform ${
          snackbar.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        } animate-in slide-in-from-bottom-5`}>
          <div className="flex items-center gap-2">
            {snackbar.type === 'success' ? (
              <FiSave className="text-lg" />
            ) : (
              <FiX className="text-lg" />
            )}
            <span>{snackbar.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}