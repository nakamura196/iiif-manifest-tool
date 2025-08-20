import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// IIIF Auth API v1 Login Service
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.searchParams.get('origin') || '';
  
  // Generate login page HTML
  const loginHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>IIIF Authentication</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          max-width: 400px;
          width: 100%;
        }
        h1 {
          color: #333;
          font-size: 24px;
          margin-bottom: 1rem;
        }
        p {
          color: #666;
          margin-bottom: 1.5rem;
        }
        button {
          background: #4F46E5;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
        }
        button:hover {
          background: #4338CA;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>IIIF認証が必要です</h1>
        <p>このコンテンツにアクセスするには、ログインが必要です。</p>
        <button onclick="doLogin()">ログイン</button>
      </div>
      <script>
        function doLogin() {
          // Redirect to main app login
          window.location.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href);
        }
        
        // Check if already logged in
        fetch('/api/iiif/auth/v1/token')
          .then(response => response.json())
          .then(data => {
            if (data.accessToken) {
              // Already logged in, close window and notify parent
              if (window.opener) {
                window.opener.postMessage({
                  type: 'iiif-auth-v1',
                  messageId: '${origin}',
                  accessToken: data.accessToken
                }, '${origin}');
                window.close();
              }
            }
          });
      </script>
    </body>
    </html>
  `;

  return new NextResponse(loginHtml, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

// Handle login callback
export async function POST() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Set authentication cookie
  const response = NextResponse.json({ success: true });
  
  response.cookies.set(
    process.env.IIIF_AUTH_COOKIE_NAME || 'iiif-auth-token',
    session.user.id,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.IIIF_AUTH_COOKIE_DOMAIN || 'localhost',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }
  );

  return response;
}