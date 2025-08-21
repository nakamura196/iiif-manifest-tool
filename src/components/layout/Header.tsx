'use client';

import { Link } from '@/i18n/routing';
import { useSession, signIn, signOut } from 'next-auth/react';
import { FiUser, FiLogIn, FiLogOut, FiHome, FiGrid, FiKey, FiSun, FiMoon, FiGlobe, FiMenu } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

const Header = () => {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  // マウント状態を管理（ハイドレーションエラー回避）
  useEffect(() => {
    setMounted(true);
  }, []);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isMenuOpen || isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isSettingsOpen]);

  const toggleLanguage = () => {
    const newLocale = locale === 'ja' ? 'en' : 'ja';
    const path = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(path);
    setIsMenuOpen(false);
  };

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 sm:px-6 justify-between sticky top-0 z-50">
      <div className="flex items-center min-w-0 flex-1">
        <Link href="/" className="hover:opacity-80 transition-opacity shrink-0 flex items-center">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 leading-none truncate">
            画像コレクション管理
          </h1>
        </Link>
      </div>
      <div className="flex items-center">
        {status === 'loading' ? (
          <div className="text-gray-500">...</div>
        ) : session ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="メニュー"
            >
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || ''}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <FiUser className="w-8 h-8 p-1 border rounded-full" />
              )}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || ''}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <FiUser className="w-8 h-8 p-1 border rounded-full" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FiHome className="w-4 h-4" />
                  <span>ホーム</span>
                </Link>

                <Link
                  href="/dashboard"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FiGrid className="w-4 h-4" />
                  <span>ダッシュボード</span>
                </Link>

                <Link
                  href="/api-doc/auth-info"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FiKey className="w-4 h-4" />
                  <span>API認証情報</span>
                </Link>

                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                {mounted && (
                  <button
                    onClick={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  >
                    {theme === 'dark' ? (
                      <FiSun className="w-4 h-4" />
                    ) : (
                      <FiMoon className="w-4 h-4" />
                    )}
                    <span>{theme === 'dark' ? 'ライトモード' : 'ダークモード'}</span>
                  </button>
                )}

                <button
                  onClick={toggleLanguage}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                >
                  <FiGlobe className="w-4 h-4" />
                  <span>{locale === 'ja' ? 'English' : '日本語'}</span>
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                >
                  <FiLogOut className="w-4 h-4" />
                  <span>ログアウト</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => signIn('google')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              <FiLogIn className="w-5 h-5" />
              <span className="text-sm">ログイン</span>
            </button>
            
            {/* 設定メニュー（ハンバーガー） */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                aria-label="設定メニュー"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              
              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  {mounted && (
                    <button
                      onClick={() => {
                        setTheme(theme === 'dark' ? 'light' : 'dark');
                        setIsSettingsOpen(false);
                      }}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                    >
                      {theme === 'dark' ? (
                        <FiSun className="w-4 h-4" />
                      ) : (
                        <FiMoon className="w-4 h-4" />
                      )}
                      <span>{theme === 'dark' ? 'ライトモード' : 'ダークモード'}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      toggleLanguage();
                      setIsSettingsOpen(false);
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  >
                    <FiGlobe className="w-4 h-4" />
                    <span>{locale === 'ja' ? 'English' : '日本語'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;