import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/iiif-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    
    // Check if auth header is present
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        '@context': 'http://iiif.io/api/auth/2/context.json',
        type: 'AuthProbeResult2',
        status: 401,
        note: { en: ['Authentication required'] },
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAuthToken(token);

    if (!decoded || decoded.itemId !== id) {
      return NextResponse.json({
        '@context': 'http://iiif.io/api/auth/2/context.json',
        type: 'AuthProbeResult2',
        status: 401,
        note: { en: ['Invalid or expired token'] },
      });
    }

    // Parse the combined ID to check ownership
    const parts = id.includes('_') ? id.split('_') : id.split('-');
    if (parts.length !== 3) {
      return NextResponse.json({
        '@context': 'http://iiif.io/api/auth/2/context.json',
        type: 'AuthProbeResult2',
        status: 400,
        note: { en: ['Invalid ID format'] },
      });
    }

    const [userId] = parts;

    // Verify user has access
    if (userId !== decoded.userId) {
      return NextResponse.json({
        '@context': 'http://iiif.io/api/auth/2/context.json',
        type: 'AuthProbeResult2',
        status: 403,
        note: { en: ['Access denied'] },
      });
    }

    // Success
    return NextResponse.json({
      '@context': 'http://iiif.io/api/auth/2/context.json',
      type: 'AuthProbeResult2',
      status: 200,
    });
  } catch (error) {
    console.error('Error in probe service:', error);
    return NextResponse.json({
      '@context': 'http://iiif.io/api/auth/2/context.json',
      type: 'AuthProbeResult2',
      status: 500,
      note: { en: ['Internal server error'] },
    });
  }
}