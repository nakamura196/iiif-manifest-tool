import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.MDX_S3_ENDPOINT,
  region: process.env.MDX_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MDX_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MDX_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export interface UserSettings {
  publicCollectionTitle?: {
    ja: string;
    en: string;
  };
  publicCollectionDescription?: {
    ja: string;
    en: string;
  };
  selfMuseumSettings?: {
    showPrivateCollections?: boolean;
    customBranding?: string;
  };
  updatedAt?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  publicCollectionTitle: {
    ja: 'マイコレクション',
    en: 'My Collections'
  },
  publicCollectionDescription: {
    ja: 'あなたの画像コレクションを管理できます',
    en: 'Manage your image collections'
  }
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const key = `users/${userId}/settings.json`;
    const command = new GetObjectCommand({
      Bucket: process.env.MDX_S3_BUCKET_NAME!,
      Key: key,
    });

    const response = await s3Client.send(command);
    const bodyString = await response.Body?.transformToString();
    
    if (!bodyString) return DEFAULT_SETTINGS;
    
    const settings = JSON.parse(bodyString);
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch {
    // Return default settings if file doesn't exist
    return DEFAULT_SETTINGS;
  }
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<boolean> {
  try {
    const key = `users/${userId}/settings.json`;
    const updatedSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    
    const command = new PutObjectCommand({
      Bucket: process.env.MDX_S3_BUCKET_NAME!,
      Key: key,
      Body: JSON.stringify(updatedSettings, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error saving user settings:', error);
    return false;
  }
}