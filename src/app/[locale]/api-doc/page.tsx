'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch('/api/openapi.json')
        .then((res) => res.json())
        .then((data) => {
          // Add authorization header with session token if available
          const modifiedSpec = {
            ...data,
            components: {
              ...data.components,
              securitySchemes: {
                ...data.components?.securitySchemes,
                googleAuth: {
                  type: 'oauth2',
                  flows: {
                    authorizationCode: {
                      authorizationUrl: '/api/auth/signin/google',
                      tokenUrl: '/api/auth/callback/google',
                      scopes: {
                        profile: 'Access user profile',
                        email: 'Access user email',
                      },
                    },
                  },
                  description: 'Google OAuth2 authentication via NextAuth',
                },
              },
            },
          };
          setSpec(modifiedSpec);
        });
    }
  }, [session]);

  if (status === 'loading' || !spec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading API documentation...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  // Custom request interceptor to add session cookie
  const requestInterceptor = (req: { url: string; headers: Record<string, string> }) => {
    // Add current session info in headers if available
    if (session?.user?.email) {
      req.headers['X-User-Email'] = session.user.email;
      req.headers['X-User-Id'] = session.user.id || '';
    }
    return req;
  };

  return (
    <div className="min-h-screen">
      <div className="bg-white dark:bg-gray-800 border-b p-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">API Documentation</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Logged in as: {session?.user?.email}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/api-doc/auth-info"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                認証情報を確認
              </Link>
              <Link
                href="/ja/dashboard"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                ダッシュボード
              </Link>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-500 bg-gray-100 dark:bg-gray-900 rounded p-3">
            <p className="font-semibold mb-2">認証方法:</p>
            <ol className="space-y-1">
              <li>1. 右上の「Authorize」ボタンをクリック</li>
              <li>2. 「sessionAuth」に認証情報ページで取得したトークンを入力</li>
              <li>3. APIエンドポイントの「Try it out」でテスト実行</li>
            </ol>
          </div>
        </div>
      </div>
      <SwaggerUI 
        spec={spec}
        requestInterceptor={requestInterceptor}
        withCredentials={true}
        persistAuthorization={true}
        docExpansion="list"
        defaultModelsExpandDepth={1}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        tryItOutEnabled={true}
      />
    </div>
  );
}