/**
 * IIIF v3 Presentation API type definitions
 * Based on https://iiif.io/api/presentation/3.0/
 */

/**
 * Multilingual text value in IIIF v3 format
 * Keys are language codes (e.g., 'ja', 'en', 'none')
 * Values are arrays of strings
 */
export interface IIIFMultilingualText {
  [language: string]: string[];
}

/**
 * IIIF v3 Collection for API responses
 */
export interface IIIFCollectionResponse {
  id: string;
  label: IIIFMultilingualText;
  summary?: IIIFMultilingualText;
  isPublic: boolean;
  createdAt: string;
  url?: string;
  _count: {
    items: number;
  };
}

/**
 * IIIF v3 Item/Manifest for API responses
 */
export interface IIIFItemResponse {
  id: string;
  label: IIIFMultilingualText;
  summary?: IIIFMultilingualText;
  thumbnail?: string;
  images?: Array<{
    id: string;
    url: string;
    width?: number;
    height?: number;
  }>;
  metadata?: Array<{
    label: IIIFMultilingualText;
    value: IIIFMultilingualText;
  }>;
  location?: {
    latitude: number;
    longitude: number;
    label?: string;
  };
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Helper functions for working with IIIF multilingual text
 */
export const IIIFTextHelpers = {
  /**
   * Get the first available text value with language preference
   * Priority: ja > en > none > first available
   */
  getText(text: IIIFMultilingualText | undefined, preferredLang?: 'ja' | 'en'): string | undefined {
    if (!text) return undefined;
    
    if (preferredLang && text[preferredLang]?.[0]) {
      return text[preferredLang][0];
    }
    
    return text.ja?.[0] || text.en?.[0] || text.none?.[0] || Object.values(text)[0]?.[0];
  },

  /**
   * Create IIIF multilingual text from string values
   */
  createText(ja?: string, en?: string, none?: string): IIIFMultilingualText | undefined {
    if (!ja && !en && !none) return undefined;
    
    const text: IIIFMultilingualText = {};
    if (ja) text.ja = [ja];
    if (en) text.en = [en];
    if (none) text.none = [none];
    
    return text;
  },

  /**
   * Normalize various text formats to IIIF v3 format
   */
  normalizeText(input: any): IIIFMultilingualText | undefined {
    if (!input) return undefined;
    
    // Already IIIF v3 format
    if (typeof input === 'object' && !Array.isArray(input)) {
      const normalized: IIIFMultilingualText = {};
      
      for (const [lang, value] of Object.entries(input)) {
        if (Array.isArray(value)) {
          // Check if array contains strings or objects
          const firstItem = value[0];
          if (typeof firstItem === 'string') {
            normalized[lang] = value;
          } else if (typeof firstItem === 'object' && firstItem !== null) {
            // Handle incorrectly nested objects
            const extracted = (firstItem as any)[lang] || (firstItem as any).ja || (firstItem as any).en;
            if (extracted) {
              normalized[lang] = [extracted];
            }
          }
        } else if (typeof value === 'string') {
          // Convert string to array
          normalized[lang] = [value];
        }
      }
      
      return Object.keys(normalized).length > 0 ? normalized : undefined;
    }
    
    // Single string value
    if (typeof input === 'string') {
      return { none: [input] };
    }
    
    return undefined;
  }
};