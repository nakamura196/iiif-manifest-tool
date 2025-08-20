'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FiCopy, FiCheck, FiInfo, FiKey } from 'react-icons/fi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthInfoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || 'ja';
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);


  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">API認証情報</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FiInfo className="text-blue-500" />
          ユーザー情報
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              ユーザーID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={session.user?.id || 'N/A'}
                readOnly
                className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard(session.user?.id || '', 'userId')}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {copiedField === 'userId' ? <FiCheck className="text-green-500" /> : <FiCopy />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              メールアドレス
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={session.user?.email || 'N/A'}
                readOnly
                className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard(session.user?.email || '', 'email')}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {copiedField === 'email' ? <FiCheck className="text-green-500" /> : <FiCopy />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FiKey className="text-green-500" />
          API認証方法
        </h2>
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              現在のセッション
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              現在ログイン中のため、ブラウザから直接APIを呼び出せます。
              Swagger UIの「Try it out」機能も、現在のセッションを使用して実行されます。
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">プログラムからのアクセス</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              外部プログラムからAPIにアクセスする場合は、以下の方法を使用してください：
            </p>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <div>
                  <strong>Cookie認証:</strong> ブラウザのセッションCookieを含めてリクエストを送信
                </div>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <div>
                  <strong>Bearer Token認証:</strong> IIIF Auth APIから取得したトークンを使用（非公開リソース用）
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">使用方法</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <div>
              <Link href={`/${locale}/api-doc`} className="text-blue-500 hover:underline">Swagger UI</Link>を開く
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <div>
              使用したいAPIエンドポイントを選択
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <div>
              「Try it out」ボタンをクリック
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <div>
              必要なパラメータを入力
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <div>
              「Execute」をクリックしてAPIを実行
            </div>
          </li>
        </ol>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">注意事項</h3>
        <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
          <li>• Swagger UIからのリクエストは現在のブラウザセッションを使用します</li>
          <li>• ログアウトするとAPIへのアクセスができなくなります</li>
          <li>• 非公開アイテムへのアクセスには所有者権限が必要です</li>
          <li>• IIIF画像の認証には別途Bearer tokenが必要な場合があります</li>
        </ul>
      </div>

      <div className="mt-6 flex gap-4">
        <Link
          href={`/${locale}/api-doc`}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Swagger UIを開く
        </Link>
        <Link
          href={`/${locale}/dashboard`}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}