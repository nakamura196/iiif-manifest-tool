#!/usr/bin/env python3
import json
import csv
import requests
from urllib.parse import quote

def fetch_json_data(url):
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def convert_to_csv(json_data, output_file):
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['id', 'x', 'y', 'latitude', 'longitude', 'label', 'tags', 'url', 'xywh']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        point_idx = 1
        for item in json_data:
            # Filter only items with specific manifest
            manifest_url = item.get('manifest', '')
            if manifest_url != 'https://www.hi.u-tokyo.ac.jp/collection/digitalgallery/ryukyu/data/iiif/0001/manifest.json':
                continue
                
            lat = item.get('latitude')
            lon = item.get('longitude')
            
            # Skip items without valid latitude or longitude
            if not lat or not lon:
                continue
            # Skip if coordinates are lists with empty strings
            if isinstance(lat, list) and (not lat[0] or lat[0] == ''):
                continue
            if isinstance(lon, list) and (not lon[0] or lon[0] == ''):
                continue
                
            # Extract coordinate values
            if isinstance(lat, list):
                lat = lat[0]
            if isinstance(lon, list):
                lon = lon[0]
                
            # Extract category/tags
            tags = item.get('category', '')
            if isinstance(tags, list):
                tags = ';'.join(tags) if tags else ''
                
            # Extract x, y, w, h from member field and calculate center point
            x_center, y_center, xywh = '', '', ''
            member = item.get('member', '')
            if member and '#xywh=' in member:
                xywh_part = member.split('#xywh=')[1]
                coords = xywh_part.split(',')
                if len(coords) >= 4:
                    x_val = int(coords[0])
                    y_val = int(coords[1])
                    w_val = int(coords[2])
                    h_val = int(coords[3])
                    # Calculate center point
                    x_center = str(x_val + w_val // 2)
                    y_center = str(y_val + h_val // 2)
                    xywh = xywh_part
                    
            row = {
                'id': item.get('objectID', f'point_{point_idx}'),
                'x': x_center,
                'y': y_center,
                'latitude': lat,
                'longitude': lon,
                'label': item.get('label', ''),
                'tags': tags,
                'url': f"https://www.google.com/maps?q={lat},{lon}",
                'xywh': xywh
            }
            
            writer.writerow(row)
            point_idx += 1
    
    print(f"CSV file created: {output_file} with {point_idx - 1} items")

def main():
    url = "https://www.hi.u-tokyo.ac.jp/collection/digitalgallery/ryukyu/data/index.json"
    output_file = "ryukyu_annotations.csv"
    target_manifest = "https://www.hi.u-tokyo.ac.jp/collection/digitalgallery/ryukyu/data/iiif/0001/manifest.json"
    
    try:
        print(f"Fetching data from: {url}")
        json_data = fetch_json_data(url)
        print(f"Found {len(json_data)} total items")
        print(f"Filtering for manifest: {target_manifest}")
        
        convert_to_csv(json_data, output_file)
        
        # Show first few entries
        print("\nFirst 5 entries:")
        for item in json_data[:5]:
            print(f"- {item.get('label', 'No label')}: {item.get('category', '')} at ({item.get('latitude', 'N/A')}, {item.get('longitude', 'N/A')})")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()