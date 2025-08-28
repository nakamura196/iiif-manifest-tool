import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ListObjectsV2Command, ListObjectsV2CommandOutput, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';
import archiver from 'archiver';
import { Readable } from 'stream';

// Admin users list (add your admin email addresses here)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

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
    const action = searchParams.get('action');

    // If action is 'list', return file listing
    if (action === 'list') {
      return await listAllFiles();
    }

    // Default action: download all files as zip
    return await downloadAllFiles();
  } catch (error) {
    console.error('Error in backup API:', error);
    return NextResponse.json(
      { error: 'Failed to process backup request' },
      { status: 500 }
    );
  }
}

async function listAllFiles() {
  try {
    const allFiles: { key: string; size: number; lastModified: Date }[] = [];
    let continuationToken: string | undefined = undefined;
    let totalSize = 0;

    do {
      const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME!,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response: ListObjectsV2CommandOutput = await s3Client.send(listCommand);
      
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            allFiles.push({
              key: object.Key,
              size: object.Size || 0,
              lastModified: object.LastModified || new Date(),
            });
            totalSize += object.Size || 0;
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return NextResponse.json({
      files: allFiles,
      totalCount: allFiles.length,
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    });
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

async function downloadAllFiles() {
  try {
    // Create a stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create zip archive
          const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
          });

          // Handle archive events
          archive.on('data', (chunk) => {
            controller.enqueue(chunk);
          });

          archive.on('end', () => {
            controller.close();
          });

          archive.on('error', (err) => {
            console.error('Archive error:', err);
            controller.error(err);
          });

          // List all files
          let continuationToken: string | undefined = undefined;
          let fileCount = 0;

          do {
            const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
              Bucket: process.env.S3_BUCKET_NAME!,
              ContinuationToken: continuationToken,
              MaxKeys: 100, // Process in smaller batches
            });

            const listResponse: ListObjectsV2CommandOutput = await s3Client.send(listCommand);
            
            if (listResponse.Contents) {
              for (const object of listResponse.Contents) {
                if (object.Key) {
                  try {
                    // Get file from S3
                    const getCommand = new GetObjectCommand({
                      Bucket: process.env.S3_BUCKET_NAME!,
                      Key: object.Key,
                    });

                    const getResponse = await s3Client.send(getCommand);
                    
                    if (getResponse.Body) {
                      // Convert AWS SDK stream to Node.js Readable stream
                      const bodyStream = getResponse.Body as Readable;
                      
                      // Add file to archive
                      archive.append(bodyStream, { name: object.Key });
                      fileCount++;
                      
                      // Log progress
                      console.log(`Added to archive: ${object.Key} (${fileCount} files processed)`);
                    }
                  } catch (fileError) {
                    console.error(`Error processing file ${object.Key}:`, fileError);
                    // Continue with other files even if one fails
                  }
                }
              }
            }

            continuationToken = listResponse.NextContinuationToken;
          } while (continuationToken);

          // Finalize the archive
          await archive.finalize();
          console.log(`Archive finalized with ${fileCount} files`);
        } catch (error) {
          console.error('Error creating backup:', error);
          controller.error(error);
        }
      }
    });

    // Create response with appropriate headers
    const response = new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="iiif-backup-${new Date().toISOString().split('T')[0]}.zip"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    console.error('Error downloading files:', error);
    throw error;
  }
}

// POST endpoint for initiating large backup with progress
export async function POST(request: NextRequest) {
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

    const { includePatterns, excludePatterns } = await request.json();

    // For large backups, we could implement a job queue system
    // For now, return information about what would be backed up
    const files = await getFilteredFiles(includePatterns, excludePatterns);
    
    return NextResponse.json({
      message: 'Backup request received',
      filesCount: files.length,
      estimatedSize: files.reduce((sum, file) => sum + file.size, 0),
      files: files.slice(0, 100), // Return first 100 files as preview
    });
  } catch (error) {
    console.error('Error in backup POST:', error);
    return NextResponse.json(
      { error: 'Failed to process backup request' },
      { status: 500 }
    );
  }
}

async function getFilteredFiles(
  includePatterns?: string[],
  excludePatterns?: string[]
): Promise<{ key: string; size: number }[]> {
  const allFiles: { key: string; size: number }[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const response: ListObjectsV2CommandOutput = await s3Client.send(listCommand);
    
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          // Apply filters if provided
          let include = true;
          
          if (includePatterns && includePatterns.length > 0) {
            include = includePatterns.some(pattern => 
              object.Key?.includes(pattern) || false
            );
          }
          
          if (excludePatterns && excludePatterns.length > 0) {
            include = include && !excludePatterns.some(pattern => 
              object.Key?.includes(pattern) || false
            );
          }
          
          if (include) {
            allFiles.push({
              key: object.Key,
              size: object.Size || 0,
            });
          }
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return allFiles;
}