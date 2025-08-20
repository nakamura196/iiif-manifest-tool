'use client';

import { Link } from '@/i18n/routing';
import { ToggleLanguage } from '@/components/layout/ToggleLanguage';
import { ToggleTheme } from '@/components/layout/ToggleTheme';
import { useSession, signIn, signOut } from 'next-auth/react';
import { FiUser, FiLogIn, FiLogOut } from 'react-icons/fi';

const Header = () => {
  const { data: session, status } = useSession();

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 sm:px-6 justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        <Link href="/" className="hover:opacity-80 transition-opacity shrink-0 flex items-center">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">
            IIIF Manifest Tool
          </h1>
        </Link>
        {session && (
          <>
            <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              ダッシュボード
            </Link>
            <Link href="/api-doc/auth-info" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              API認証情報
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        {status === 'loading' ? (
          <div className="text-gray-500">...</div>
        ) : session ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || ''}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <FiUser className="w-5 h-5" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">
                {session.user?.name}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              title="ログアウト"
            >
              <FiLogOut />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <FiLogIn />
            <span className="text-sm">ログイン</span>
          </button>
        )}
        <ToggleTheme />
        <ToggleLanguage />
      </div>
    </header>
  );
};

export default Header;