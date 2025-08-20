// IIIF Auth Service definitions for both v1 and v2

import { IIIFManifest } from './iiif-manifest';

interface AuthService {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  id?: string;
  type?: string;
  profile?: string;
  label?: string | { [key: string]: string[] };
  service?: AuthService | AuthService[];
}


interface ManifestWithAuth extends Partial<IIIFManifest> {
  service?: AuthService[];
}

export function getAuthServices(isPublic: boolean): AuthService[] | undefined {
  if (isPublic) return undefined;

  const authVersion = process.env.IIIF_AUTH_VERSION || '1';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (authVersion === '2') {
    // IIIF Auth API v2
    return [
      {
        "@context": "http://iiif.io/api/auth/2/context.json",
        "id": `${baseUrl}/api/iiif/auth/v2/access`,
        "type": "AuthAccessService2",
        "profile": "active",
        "label": {
          "en": ["Access this resource"]
        },
        "service": [
          {
            "id": `${baseUrl}/api/iiif/auth/v2/probe`,
            "type": "AuthProbeService2"
          }
        ]
      }
    ];
  } else {
    // IIIF Auth API v1 (default)
    return [
      {
        "@context": "http://iiif.io/api/auth/1/context.json",
        "@id": `${baseUrl}/api/iiif/auth/v1/login`,
        "@type": "AuthCookieService1",
        "profile": "http://iiif.io/api/auth/1/login",
        "label": "Login to view this resource",
        "service": [
          {
            "@id": `${baseUrl}/api/iiif/auth/v1/token`,
            "@type": "AuthTokenService1",
            "profile": "http://iiif.io/api/auth/1/token"
          },
          {
            "@id": `${baseUrl}/api/iiif/auth/v1/logout`,
            "@type": "AuthLogoutService1",
            "profile": "http://iiif.io/api/auth/1/logout",
            "label": "Logout"
          }
        ]
      }
    ];
  }
}

export function addAuthServicesToManifest(manifest: ManifestWithAuth, isPublic: boolean): ManifestWithAuth {
  if (isPublic) return manifest;

  const authServices = getAuthServices(isPublic);
  
  if (authServices) {
    // Add auth services to the manifest
    manifest.service = authServices;

    // Also add to each canvas/image if needed
    if (manifest.items) {
      manifest.items = manifest.items.map((canvas) => {
        if (canvas.items?.[0]?.items?.[0]?.body && authServices) {
          // Add auth service to image body
          if (!canvas.items[0].items[0].body.service) {
            canvas.items[0].items[0].body.service = [];
          }
          canvas.items[0].items[0].body.service = authServices;
        }
        return canvas;
      });
    }
  }

  return manifest;
}

export function getImageAuthService(imageUrl: string, isPublic: boolean) {
  if (isPublic) return undefined;

  const authVersion = process.env.IIIF_AUTH_VERSION || '1';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (authVersion === '2') {
    return {
      "@context": "http://iiif.io/api/auth/2/context.json",
      "id": `${baseUrl}/api/iiif/auth/v2/probe?resource=${encodeURIComponent(imageUrl)}`,
      "type": "AuthProbeService2",
      "service": [
        {
          "id": `${baseUrl}/api/iiif/auth/v2/access`,
          "type": "AuthAccessService2",
          "profile": "active"
        }
      ]
    };
  } else {
    return {
      "@context": "http://iiif.io/api/auth/1/context.json",
      "@id": `${baseUrl}/api/iiif/auth/v1/login`,
      "@type": "AuthCookieService1",
      "profile": "http://iiif.io/api/auth/1/login",
      "label": "Login required",
      "service": {
        "@id": `${baseUrl}/api/iiif/auth/v1/token`,
        "@type": "AuthTokenService1",
        "profile": "http://iiif.io/api/auth/1/token"
      }
    };
  }
}