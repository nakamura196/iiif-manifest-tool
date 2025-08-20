import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      // Redirect to login
      const loginUrl = `${process.env.NEXTAUTH_URL}/api/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`;
      return NextResponse.redirect(loginUrl);
    }

    // Parse the combined ID
    const parts = id.includes('_') ? id.split('_') : id.split('-');
    if (parts.length !== 3) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Invalid ID</title>
        </head>
        <body>
          <h1>Invalid ID format</h1>
          <p>The requested resource ID is invalid.</p>
        </body>
        </html>`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }

    const [userId] = parts;

    // Check if user owns the item
    if (userId !== session.user.id) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Access Denied</title>
        </head>
        <body>
          <h1>Access Denied</h1>
          <p>You do not have permission to access this resource.</p>
        </body>
        </html>`,
        {
          status: 403,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }

    // Success - redirect to token service
    const tokenUrl = `${process.env.NEXTAUTH_URL}/api/iiif/auth/token/${id}?` + 
      `messageId=${request.nextUrl.searchParams.get('messageId') || ''}` +
      `&origin=${request.nextUrl.searchParams.get('origin') || ''}`;
    
    return NextResponse.redirect(tokenUrl);
  } catch (error) {
    console.error('Error in access service:', error);
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
      </head>
      <body>
        <h1>Error</h1>
        <p>An error occurred while processing your request.</p>
      </body>
      </html>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
}