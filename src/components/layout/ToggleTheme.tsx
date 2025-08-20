'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export const ToggleTheme = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffectはクライアントサイドでのみ実行
  useEffect(() => {
    setMounted(true);
  }, []);

  // マウント前はボタンを表示しない（SSRとの整合性のため）
  if (!mounted) {
    return (
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
        aria-label="Loading theme toggle"
      >
        <span className="sr-only">Loading theme toggle</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 cursor-pointer"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <FiSun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <FiMoon className="w-5 h-5" aria-hidden="true" />
      )}
      <span className="sr-only">
        {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </button>
  );
};
