import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  endpoint: process.env.MDX_S3_ENDPOINT,
  region: process.env.MDX_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MDX_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MDX_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
) {
  const command = new PutObjectCommand({
    Bucket: process.env.MDX_S3_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read',
  });

  await s3Client.send(command);
  
  return `${process.env.MDX_S3_ENDPOINT}/${process.env.MDX_S3_BUCKET_NAME}/${key}`;
}

export async function getSignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.MDX_S3_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.MDX_S3_BUCKET_NAME!,
    Key: key,
  });

  await s3Client.send(command);
}

export function getS3Url(key: string) {
  return `${process.env.MDX_S3_ENDPOINT}/${process.env.MDX_S3_BUCKET_NAME}/${key}`;
}

export { s3Client };