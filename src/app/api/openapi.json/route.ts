import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'IIIF Manifest Tool API',
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
    '/api/manifests/{itemId}': {
      get: {
        tags: ['Manifests'],
        summary: 'Get IIIF manifest',
        description: 'Retrieve the IIIF Presentation API 3.0 manifest for an item',
        parameters: [
          {
            name: 'itemId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Item ID',
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'IIIF Manifest',
            content: {
              'application/ld+json': {
                schema: { $ref: '#/components/schemas/IIIFManifest' },
              },
            },
          },
          401: {
            description: 'Unauthorized (authentication required)',
            content: {
              'application/ld+json': {
                schema: { $ref: '#/components/schemas/IIIFManifest' },
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