import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

export interface IIIFAuthToken {
  itemId: string;
  userId: string;
  exp: number;
}

export function generateAuthToken(itemId: string, userId: string): string {
  return jwt.sign(
    {
      itemId,
      userId,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    },
    JWT_SECRET
  );
}

export function verifyAuthToken(token: string): IIIFAuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as IIIFAuthToken;
    return decoded;
  } catch {
    return null;
  }
}

import { IIIFManifest } from './iiif-manifest';

interface ManifestWithServices extends IIIFManifest {
  services?: Array<{
    id: string;
    type: string;
    profile: string;
    errorHeading?: { [key: string]: string[] };
    errorNote?: { [key: string]: string[] };
    failureHeading?: { [key: string]: string[] };
    failureNote?: { [key: string]: string[] };
    service?: Array<{
      id: string;
      type: string;
      profile: string;
      label?: { [key: string]: string[] };
      confirmLabel?: { [key: string]: string[] };
      failureHeading?: { [key: string]: string[] };
      failureNote?: { [key: string]: string[] };
      service?: Array<{
        id: string;
        type: string;
        profile: string;
      }>;
    }>;
  }>;
}

export function addAuthServiceToManifest(manifest: ManifestWithServices, itemId: string): ManifestWithServices {
  // Add auth service to manifest
  if (!manifest.services) {
    manifest.services = [];
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  manifest.services.push({
    id: `${baseUrl}/api/iiif/auth/probe/${itemId}`,
    type: 'AuthProbeService2',
    profile: 'http://iiif.io/api/auth/2/probe',
    errorHeading: { en: ['Authentication Required'] },
    errorNote: { en: ['This content requires authentication'] },
    failureHeading: { en: ['Authentication Failed'] },
    failureNote: { en: ['Your credentials were not accepted'] },
    service: [
      {
        id: `${baseUrl}/api/iiif/auth/access/${itemId}`,
        type: 'AuthAccessService2',
        profile: 'http://iiif.io/api/auth/2/access',
        label: { en: ['Login to View Content'] },
        confirmLabel: { en: ['Login'] },
        failureHeading: { en: ['Login Failed'] },
        failureNote: { en: ['Unable to authenticate'] },
        service: [
          {
            id: `${baseUrl}/api/iiif/auth/token/${itemId}`,
            type: 'AuthAccessTokenService2',
            profile: 'http://iiif.io/api/auth/2/token',
          },
        ],
      },
    ],
  });

  return manifest;
}