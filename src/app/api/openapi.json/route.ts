import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/constants/metadata';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: `${SITE_CONFIG.name.en} API`,
    version: '1.0.0',
    description: 'API for managing IIIF collections and manifests with mdx object storage',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      description: 'Current server',
    },
  ],
  tags: [
    {
      name: 'Collections',
      description: 'Operations related to IIIF collections',
    },
    {
      name: 'Items',
      description: 'Operations related to IIIF manifest items',
    },
    {
      name: 'Manifests',
      description: 'IIIF manifest endpoints',
    },
    {
      name: 'IIIF',
      description: 'IIIF Presentation API endpoints for collections and manifests',
    },
    {
      name: 'Authentication',
      description: 'Authentication and authorization endpoints',
    },
    {
      name: 'Upload',
      description: 'File upload operations',
    },
  ],
  paths: {
    '/api/collections': {
      get: {
        tags: ['Collections'],
        summary: 'List user collections',
        description: 'Retrieve all collections owned by the authenticated user',
        security: [{ sessionAuth: [] }],
        responses: {
          200: {
            description: 'List of collections',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Collection' },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Collections'],
        summary: 'Create a new collection',
        description: 'Create a new IIIF collection',
        security: [{ sessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', minLength: 1 },
                  description: { type: 'string', nullable: true },
                  isPublic: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Collection created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Collection' },
              },
            },
          },
          400: {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/collections/{collectionId}/items': {
      get: {
        tags: ['Items'],
        summary: 'List items in a collection',
        description: 'Retrieve all items in a specific collection',
        parameters: [
          {
            name: 'collectionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Collection ID',
          },
        ],
        responses: {
          200: {
            description: 'List of items',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Item' },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized (private collection)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Collection not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Items'],
        summary: 'Create a new item',
        description: 'Create a new IIIF manifest item in a collection',
        security: [{ sessionAuth: [] }],
        parameters: [
          {
            name: 'collectionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Collection ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'images'],
                properties: {
                  title: { type: 'string', minLength: 1 },
                  description: { type: 'string', nullable: true },
                  images: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      properties: {
                        url: { type: 'string', format: 'uri' },
                        width: { type: 'integer' },
                        height: { type: 'integer' },
                        mimeType: { type: 'string' },
                        infoJson: { type: 'string', nullable: true },
                      },
                    },
                  },
                  isPublic: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Item created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Item' },
              },
            },
          },
          400: {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Collection not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/collections/{collectionId}/items/{itemId}': {
      get: {
        tags: ['Items'],
        summary: 'Get a specific item',
        description: 'Retrieve a specific item by ID',
        parameters: [
          {
            name: 'collectionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'itemId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Item details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Item' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Item not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Items'],
        summary: 'Update an item',
        description: 'Update an existing IIIF manifest item',
        security: [{ sessionAuth: [] }],
        parameters: [
          {
            name: 'collectionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'itemId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'images'],
                properties: {
                  title: { type: 'string', minLength: 1 },
                  description: { type: 'string', nullable: true },
                  images: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      properties: {
                        url: { type: 'string', format: 'uri' },
                        width: { type: 'integer' },
                        height: { type: 'integer' },
                        mimeType: { type: 'string' },
                        infoJson: { type: 'string', nullable: true },
                      },
                    },
                  },
                  isPublic: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Item updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Item' },
              },
            },
          },
          400: {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Item not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Items'],
        summary: 'Delete an item',
        description: 'Delete an existing IIIF manifest item',
        security: [{ sessionAuth: [] }],
        parameters: [
          {
            name: 'collectionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'itemId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Item deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Item not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/iiif/3/{manifestId}/manifest': {
      get: {
        tags: ['Manifests'],
        summary: 'Get IIIF Presentation API 3.0 manifest',
        description: 'Retrieve the IIIF Presentation API 3.0 manifest for an item using combined ID format (userId_collectionId_itemId)',
        parameters: [
          {
            name: 'manifestId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Combined manifest ID (format: userId_collectionId_itemId)',
            example: '101172437055322427006_59bf8c5f-00db-4dc9-8aba-8552e2d2bb61_ab60b932-df0d-4a46-8e59-3e3306372ba9',
          },
        ],
        responses: {
          200: {
            description: 'IIIF Presentation API 3.0 Manifest',
            content: {
              'application/ld+json': {
                schema: { $ref: '#/components/schemas/IIIFManifest' },
              },
            },
          },
          401: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Manifest not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/iiif/2/{manifestId}/manifest': {
      get: {
        tags: ['Manifests'],
        summary: 'Get IIIF Presentation API 2.1 manifest',
        description: 'Retrieve the IIIF Presentation API 2.1 manifest for an item using combined ID format (userId_collectionId_itemId)',
        parameters: [
          {
            name: 'manifestId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Combined manifest ID (format: userId_collectionId_itemId)',
            example: '101172437055322427006_59bf8c5f-00db-4dc9-8aba-8552e2d2bb61_ab60b932-df0d-4a46-8e59-3e3306372ba9',
          },
        ],
        responses: {
          200: {
            description: 'IIIF Presentation API 2.1 Manifest',
            content: {
              'application/ld+json': {
                schema: { $ref: '#/components/schemas/IIIFV2Manifest' },
              },
            },
          },
          401: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Manifest not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Upload an image',
        description: 'Upload an image to mdx object storage',
        security: [{ sessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file to upload',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Upload successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    width: { type: 'integer' },
                    height: { type: 'integer' },
                    mimeType: { type: 'string' },
                    key: { type: 'string' },
                  },
                },
              },
            },
          },
          400: {
            description: 'No file provided',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/auth/iiif/probe/{itemId}': {
      get: {
        tags: ['Authentication'],
        summary: 'IIIF Auth Probe Service',
        description: 'Check authentication status for accessing a protected item',
        parameters: [
          {
            name: 'itemId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Authentication status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', example: 'AuthProbeResult2' },
                    status: { type: 'integer' },
                    heading: { type: 'object' },
                    note: { type: 'object' },
                    service: { type: 'array' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/iiif/token/{itemId}': {
      post: {
        tags: ['Authentication'],
        summary: 'Generate IIIF Auth token',
        description: 'Generate an access token for a protected item',
        security: [{ sessionAuth: [] }],
        parameters: [
          {
            name: 'itemId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Access token generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    tokenType: { type: 'string', example: 'Bearer' },
                    expiresIn: { type: 'integer', example: 3600 },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          403: {
            description: 'Access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Item not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/iiif/3/collection/{id}': {
      get: {
        tags: ['IIIF'],
        summary: 'Get IIIF Collection manifest (default v3)',
        description: 'Retrieve IIIF Collection manifest using default version (v3.0). The ID should be in format: userId_collectionId',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Combined ID in format: userId_collectionId (e.g., 115311985812827452842_9b7999e8-5122-4994-bff2-7aa83583c9d3)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'IIIF Collection manifest',
            content: {
              'application/json': {
                schema: { 
                  type: 'object',
                  properties: {
                    '@context': { type: 'string' },
                    id: { type: 'string' },
                    type: { type: 'string', enum: ['Collection'] },
                    label: { type: 'object' },
                    items: { type: 'array' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Collection not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/iiif/2/collection/{id}': {
      get: {
        tags: ['IIIF'],
        summary: 'Get IIIF Collection (v2.1)',
        description: 'Retrieve IIIF Presentation API 2.1 collection manifest. The ID should be in format: userId_collectionId',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Combined ID in format: userId_collectionId',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'IIIF Collection v2.1',
            content: {
              'application/json': {
                schema: { 
                  type: 'object',
                  properties: {
                    '@context': { type: 'string' },
                    '@id': { type: 'string' },
                    '@type': { type: 'string', enum: ['sc:Collection'] },
                    label: { 
                      oneOf: [
                        { type: 'string' },
                        { type: 'object' }
                      ]
                    },
                    description: { type: 'string' },
                    manifests: { type: 'array' },
                    collections: { type: 'array' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized (requires authentication)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Collection not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/iiif/2/{id}/manifest': {
      get: {
        tags: ['IIIF'],
        summary: 'Get IIIF Manifest (v2.1)',
        description: 'Retrieve IIIF Presentation API 2.1 manifest. The ID should be in format: userId_collectionId_itemId',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Combined ID in format: userId_collectionId_itemId',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'IIIF Manifest v2.1',
            content: {
              'application/json': {
                schema: { 
                  type: 'object',
                  properties: {
                    '@context': { type: 'string' },
                    '@id': { type: 'string' },
                    '@type': { type: 'string', enum: ['sc:Manifest'] },
                    label: { type: 'string' },
                    sequences: { type: 'array' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized (requires authentication)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Manifest not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/iiif/{id}/manifest': {
      get: {
        tags: ['IIIF'],
        summary: 'Get IIIF Manifest (default v3)',
        description: 'Retrieve IIIF manifest using default version (v3.0). The ID should be in format: userId_collectionId_itemId',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Combined ID in format: userId_collectionId_itemId',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'IIIF Manifest v3.0',
            content: {
              'application/json': {
                schema: { 
                  type: 'object',
                  properties: {
                    '@context': { type: 'array' },
                    id: { type: 'string' },
                    type: { type: 'string', enum: ['Manifest'] },
                    label: { type: 'object' },
                    items: { type: 'array' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized (requires authentication)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Manifest not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/iiif/3/{id}/manifest': {
      get: {
        tags: ['IIIF'],
        summary: 'Get IIIF Manifest (v3.0)',
        description: 'Retrieve IIIF Presentation API 3.0 manifest. The ID should be in format: userId_collectionId_itemId',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Combined ID in format: userId_collectionId_itemId',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'IIIF Manifest v3.0',
            content: {
              'application/json': {
                schema: { 
                  type: 'object',
                  properties: {
                    '@context': { type: 'array' },
                    id: { type: 'string' },
                    type: { type: 'string', enum: ['Manifest'] },
                    label: { type: 'object' },
                    items: { type: 'array' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized (requires authentication)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Manifest not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/iiif/image/{path}': {
      get: {
        tags: ['IIIF'],
        summary: 'Get image from S3 storage',
        description: 'Proxy endpoint to retrieve images from S3 storage with proper authentication',
        parameters: [
          {
            name: 'path',
            in: 'path',
            required: true,
            description: 'S3 object path',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Image file',
            content: {
              'image/jpeg': {},
              'image/png': {},
              'image/webp': {},
            },
          },
          403: {
            description: 'Access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Image not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for IIIF Auth API (for non-public items)',
      },
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'next-auth.session-token',
        description: 'NextAuth session cookie (automatically included when logged in via Google)',
      },
    },
    schemas: {
      Collection: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          isPublic: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          _count: {
            type: 'object',
            properties: {
              items: { type: 'integer' },
            },
          },
        },
      },
      Item: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          collectionId: { type: 'string', format: 'uuid' },
          manifest: { type: 'string' },
          isPublic: { type: 'boolean' },
          images: {
            type: 'array',
            items: { $ref: '#/components/schemas/Image' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Image: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          width: { type: 'integer', nullable: true },
          height: { type: 'integer', nullable: true },
          mimeType: { type: 'string', nullable: true },
          order: { type: 'integer' },
          infoJson: { type: 'string', nullable: true },
        },
      },
      IIIFManifest: {
        type: 'object',
        description: 'IIIF Presentation API 3.0 Manifest',
        properties: {
          '@context': {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
          id: { type: 'string' },
          type: { type: 'string', enum: ['Manifest'] },
          label: { type: 'object' },
          summary: { type: 'object' },
          thumbnail: { type: 'array' },
          items: { type: 'array' },
          services: { type: 'array' },
        },
      },
      IIIFV2Manifest: {
        type: 'object',
        description: 'IIIF Presentation API 2.1 Manifest',
        properties: {
          '@context': { type: 'string' },
          '@id': { type: 'string' },
          '@type': { type: 'string', enum: ['sc:Manifest'] },
          label: {
            oneOf: [
              { type: 'string' },
              { type: 'object' },
            ],
          },
          description: { type: 'string' },
          attribution: { type: 'string' },
          license: { type: 'string' },
          metadata: { type: 'array' },
          sequences: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                '@id': { type: 'string' },
                '@type': { type: 'string', enum: ['sc:Sequence'] },
                label: { type: 'string' },
                canvases: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      '@id': { type: 'string' },
                      '@type': { type: 'string', enum: ['sc:Canvas'] },
                      label: {
                        oneOf: [
                          { type: 'string' },
                          { type: 'object' },
                        ],
                      },
                      height: { type: 'integer' },
                      width: { type: 'integer' },
                      images: { type: 'array' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}