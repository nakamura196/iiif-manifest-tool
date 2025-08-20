import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateAuthToken } from '@/lib/iiif-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST endpoint for direct token requests
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse the combined ID (userId_collectionId_itemId)
    const parts = id.includes('_') ? id.split('_') : id.split('-');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    
    const [userId] = parts;

    // Check if user is the owner
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Generate access token using the combined ID
    const accessToken = generateAuthToken(id, session.user.id);

    return NextResponse.json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for IIIF Auth 2.0 token service
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const messageId = request.nextUrl.searchParams.get('messageId');
    const origin = request.nextUrl.searchParams.get('origin');
    
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      // Return HTML page with error
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Failed</title>
          <script>
            window.opener.postMessage({
              messageId: "${messageId || ''}",
              error: "Not authenticated"
            }, "${origin || '*'}");
            window.close();
          </script>
        </head>
        <body>
          <p>Authentication failed. This window will close automatically.</p>
        </body>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }

    // Parse the combined ID
    const parts = id.includes('_') ? id.split('_') : id.split('-');
    if (parts.length !== 3) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Invalid ID</title>
          <script>
            window.opener.postMessage({
              messageId: "${messageId || ''}",
              error: "Invalid ID format"
            }, "${origin || '*'}");
            window.close();
          </script>
        </head>
        <body>
          <p>Invalid ID format. This window will close automatically.</p>
        </body>
        </html>`,
        {
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
          <script>
            window.opener.postMessage({
              messageId: "${messageId || ''}",
              error: "Access denied"
            }, "${origin || '*'}");
            window.close();
          </script>
        </head>
        <body>
          <p>Access denied. This window will close automatically.</p>
        </body>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }

    // Generate access token using the combined ID
    const accessToken = generateAuthToken(id, session.user.id);

    // Return HTML page with token
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              messageId: "${messageId || ''}",
              accessToken: "${accessToken}",
              expiresIn: 3600
            }, "${origin || '*'}");
            window.close();
          } else {
            // If no opener, return token in JSON format
            document.body.innerHTML = '<pre>' + JSON.stringify({
              accessToken: "${accessToken}",
              tokenType: "Bearer",
              expiresIn: 3600
            }, null, 2) + '</pre>';
          }
        </script>
      </head>
      <body>
        <p>Authentication successful. This window will close automatically.</p>
      </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error in token service:', error);
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <script>
          window.opener.postMessage({
            messageId: "${request.nextUrl.searchParams.get('messageId') || ''}",
            error: "Internal server error"
          }, "${request.nextUrl.searchParams.get('origin') || '*'}");
          window.close();
        </script>
      </head>
      <body>
        <p>An error occurred. This window will close automatically.</p>
      </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
}