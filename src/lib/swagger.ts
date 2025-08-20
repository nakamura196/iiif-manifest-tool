import { createSwaggerSpec } from 'next-swagger-doc';

const apiDocumentation = createSwaggerSpec({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IIIF Manifest Tool API',
      version: '1.0.0',
      description: 'API for managing IIIF collections and manifests with mdx object storage',
    },
    servers: [
      {
        url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for IIIF Auth API',
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token',
          description: 'NextAuth session cookie',
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
            type: { type: 'string' },
            label: { type: 'object' },
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
    paths: {},
  },
});

export function getApiDocs() {
  return apiDocumentation;
}