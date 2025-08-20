'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'サーバー設定に問題があります。',
    AccessDenied: 'アクセスが拒否されました。',
    Verification: '認証トークンの有効期限が切れています。',
    OAuthSignin: 'OAuth プロバイダーへの接続に失敗しました。',
    OAuthCallback: 'OAuth プロバイダーからのコールバックエラーです。',
    OAuthCreateAccount: 'アカウントの作成に失敗しました。',
    EmailCreateAccount: 'メールアカウントの作成に失敗しました。',
    Callback: 'コールバック処理中にエラーが発生しました。',
    OAuthAccountNotLinked: 'このメールアドレスは既に別のプロバイダーで使用されています。',
    EmailSignin: 'メール送信に失敗しました。',
    CredentialsSignin: '認証情報が正しくありません。',
    SessionRequired: 'このページにアクセスするにはログインが必要です。',
    Default: '認証エラーが発生しました。',
  };

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            認証エラー
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
          {error && (
            <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-500">
              エラーコード: {error}
            </p>
          )}
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            もう一度サインインする
          </Link>
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}