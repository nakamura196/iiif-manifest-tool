import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  ListObjectsV2Command, 
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand
} from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Admin users list (from environment variable)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

interface S3Object {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  contentType?: string;
}

interface BrowseResult {
  path: string;
  directories: S3Object[];
  files: S3Object[];
  parentPath?: string;
  totalSize: number;
  totalCount: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '';
    const action = searchParams.get('action');
    const key = searchParams.get('key');

    // Handle different actions
    if (action === 'download' && key) {
      return await downloadFile(key);
    } else if (action === 'preview' && key) {
      return await previewFile(key);
    } else if (action === 'signed-url' && key) {
      return await getPresignedUrl(key);
    }

    // Default action: browse directory
    return await browseDirectory(path);
  } catch (error) {
    console.error('Error in S3 browser API:', error);
    return NextResponse.json(
      { error: 'Failed to browse S3' },
      { status: 500 }
    );
  }
}

async function browseDirectory(path: string): Promise<NextResponse> {
  try {
    // Ensure path ends with / for directory listing
    const prefix = path && !path.endsWith('/') ? `${path}/` : path;
    
    // List objects in the specified path
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix,
      Delimiter: '/', // This makes it list directories separately
      MaxKeys: 1000,
    });

    const response = await s3Client.send(listCommand);
    
    const directories: S3Object[] = [];
    const files: S3Object[] = [];
    let totalSize = 0;

    // Process directories (CommonPrefixes)
    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          const name = prefix.Prefix.slice(path.length).replace(/\/$/, '');
          if (name) { // Skip empty names
            directories.push({
              key: prefix.Prefix,
              name: name.startsWith('/') ? name.slice(1) : name,
              size: 0,
              lastModified: new Date(),
              isDirectory: true,
            });
          }
        }
      }
    }

    // Process files (Contents)
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key && object.Key !== prefix) { // Skip the directory itself
          const name = object.Key.slice(prefix.length);
          if (name && !name.includes('/')) { // Only files in current directory
            files.push({
              key: object.Key,
              name,
              size: object.Size || 0,
              lastModified: object.LastModified || new Date(),
              isDirectory: false,
              contentType: detectContentType(object.Key),
            });
            totalSize += object.Size || 0;
          }
        }
      }
    }

    // Sort directories and files by name
    directories.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    // Determine parent path
    let parentPath: string | undefined;
    if (path) {
      const parts = path.split('/').filter(p => p);
      if (parts.length > 0) {
        parts.pop();
        parentPath = parts.length > 0 ? parts.join('/') : '';
      }
    }

    const result: BrowseResult = {
      path,
      directories,
      files,
      parentPath,
      totalSize,
      totalCount: directories.length + files.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error browsing directory:', error);
    throw error;
  }
}

async function downloadFile(key: string): Promise<NextResponse> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get file name from key
    const fileName = key.split('/').pop() || 'download';
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': response.ContentLength?.toString() || buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

async function previewFile(key: string): Promise<NextResponse> {
  try {
    // First get file metadata
    const headCommand = new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    const metadata = await s3Client.send(headCommand);
    const contentType = metadata.ContentType || detectContentType(key);
    
    // Only preview text, JSON, and image files
    const previewableTypes = ['text/', 'application/json', 'image/'];
    const isPreviewable = previewableTypes.some(type => contentType.startsWith(type));
    
    if (!isPreviewable) {
      return NextResponse.json({
        error: 'File type not previewable',
        contentType,
      }, { status: 400 });
    }

    // For large files, limit preview size
    const maxPreviewSize = 5 * 1024 * 1024; // 5MB
    if (metadata.ContentLength && metadata.ContentLength > maxPreviewSize) {
      return NextResponse.json({
        error: 'File too large for preview',
        size: metadata.ContentLength,
        maxSize: maxPreviewSize,
      }, { status: 400 });
    }

    // Get file content
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // For images, convert to base64
    if (contentType.startsWith('image/')) {
      // Convert stream to buffer for images
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      
      return NextResponse.json({
        type: 'image',
        contentType,
        data: `data:${contentType};base64,${base64}`,
        size: metadata.ContentLength,
      });
    }
    
    // For text/JSON, convert stream to string
    const bodyString = await response.Body.transformToString();

    // For text/JSON, return as string
    return NextResponse.json({
      type: contentType.includes('json') ? 'json' : 'text',
      contentType,
      data: bodyString,
      size: metadata.ContentLength,
    });
  } catch (error) {
    console.error('Error previewing file:', error);
    throw error;
  }
}

async function getPresignedUrl(key: string): Promise<NextResponse> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    // Generate presigned URL valid for 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return NextResponse.json({
      url,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}

// DELETE endpoint for file deletion
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { key } = await request.json();
    
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    await s3Client.send(command);
    
    return NextResponse.json({
      success: true,
      message: `File ${key} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

// Helper function to detect content type from file extension
function detectContentType(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase();
  
  const mimeTypes: { [key: string]: string } = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    // Documents
    'json': 'application/json',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'xml': 'application/xml',
    
    // Web
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    
    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}