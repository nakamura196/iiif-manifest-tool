'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  latitude: number;
  longitude: number;
  label?: string;
}

interface CollectionMapProps {
  items: MapItem[];
  onItemClick?: (itemId: string) => void;
}

export default function CollectionMap({ items, onItemClick }: CollectionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [139.6503, 35.6762], // Default to Tokyo
      zoom: 5
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    const markers = document.getElementsByClassName('maplibregl-marker');
    while (markers[0]) {
      markers[0].remove();
    }

    // Add markers for items with location
    const validItems = items.filter(item => 
      item.latitude && item.longitude && 
      !isNaN(item.latitude) && !isNaN(item.longitude)
    );

    if (validItems.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    validItems.forEach(item => {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundImage = item.thumbnail 
        ? `url(${item.thumbnail})`
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      // Add popup
      const popup = new maplibregl.Popup({ offset: 25 })
        .setHTML(`
          <div style="max-width: 200px;">
            ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}" style="width: 100%; height: 100px; object-fit: cover; margin-bottom: 8px; border-radius: 4px;">` : ''}
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${item.title}</h3>
            ${item.description ? `<p style="margin: 0; font-size: 12px; color: #666;">${item.description}</p>` : ''}
            ${item.label ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">📍 ${item.label}</p>` : ''}
          </div>
        `);

      // Create marker
      new maplibregl.Marker(el)
        .setLngLat([item.longitude, item.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Add click event
      el.addEventListener('click', () => {
        if (onItemClick) {
          onItemClick(item.id);
        }
      });

      bounds.extend([item.longitude, item.latitude]);
    });

    // Fit map to show all markers
    if (validItems.length > 1) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15
      });
    } else if (validItems.length === 1) {
      map.current.setCenter([validItems[0].longitude, validItems[0].latitude]);
      map.current.setZoom(12);
    }
  }, [items, mapLoaded, onItemClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {items.filter(item => item.latitude && item.longitude).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            位置情報が設定されているアイテムがありません
          </p>
        </div>
      )}
    </div>
  );
}