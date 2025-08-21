'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ItemLocationMapProps {
  latitude: number;
  longitude: number;
  label?: string;
  onChange?: (lat: number, lng: number) => void;
  showDefault?: boolean;
}

export default function ItemLocationMap({ latitude, longitude, label, onChange, showDefault }: ItemLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
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
        center: [longitude, latitude],
        zoom: showDefault ? 10 : 13, // Zoom out more for default view
      });

      // Add navigation controls
      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add marker only if not showing default
      if (!showDefault) {
        markerRef.current = new maplibregl.Marker({
          draggable: !!onChange,
          color: '#3B82F6', // Blue color
        })
          .setLngLat([longitude, latitude])
          .addTo(mapRef.current);
      }

      // Add popup if label exists and not showing default
      if (label && markerRef.current) {
        const popup = new maplibregl.Popup({ offset: 25 })
          .setText(label);
        markerRef.current.setPopup(popup);
      }

      // Handle marker drag
      if (onChange && markerRef.current) {
        markerRef.current.on('dragend', () => {
          if (markerRef.current) {
            const lngLat = markerRef.current.getLngLat();
            onChange(lngLat.lat, lngLat.lng);
          }
        });
      }

      // Handle map click to create or move marker
      if (onChange) {
        mapRef.current.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          
          // Create marker if it doesn't exist (first click when showing default)
          if (!markerRef.current) {
            markerRef.current = new maplibregl.Marker({
              draggable: true,
              color: '#3B82F6',
            })
              .setLngLat([lng, lat])
              .addTo(mapRef.current!);
            
            // Add drag event listener
            markerRef.current.on('dragend', () => {
              if (markerRef.current) {
                const lngLat = markerRef.current.getLngLat();
                onChange(lngLat.lat, lngLat.lng);
              }
            });
          } else {
            // Move existing marker
            markerRef.current.setLngLat([lng, lat]);
          }
          
          onChange(lat, lng);
        });
      }
    } else {
      // Update existing map
      mapRef.current.setCenter([longitude, latitude]);
      if (markerRef.current) {
        markerRef.current.setLngLat([longitude, latitude]);
        
        // Update popup if label changed
        if (label) {
          const popup = new maplibregl.Popup({ offset: 25 })
            .setText(label);
          markerRef.current.setPopup(popup);
        }
      }
    }
  }, [latitude, longitude, label, onChange, showDefault]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full rounded-lg" />
      {onChange && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg text-sm z-10">
          <p className="text-gray-600 dark:text-gray-400">
            地図をクリックまたはマーカーをドラッグして位置を変更
          </p>
        </div>
      )}
    </div>
  );
}