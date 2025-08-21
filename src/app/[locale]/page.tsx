'use client';

import { useSession, signIn } from 'next-auth/react';
import { FiImage, FiUpload, FiLock, FiGlobe, FiArrowRight, FiLogIn } from 'react-icons/fi';
import Link from 'next/link';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">
          画像コレクション管理ツール
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          画像をまとめて整理・公開・共有できるサービス
        </p>

        {session ? (
          <div className="mb-12">
            <Link
              href="/ja/dashboard"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 text-white text-base sm:text-lg rounded-lg hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              ダッシュボードへ
              <FiArrowRight />
            </Link>
          </div>
        ) : (
          <div className="mb-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-4">
              ログインして、あなたの画像コレクションを管理しましょう
            </p>
            <button
              onClick={() => signIn()}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 text-white text-base sm:text-lg rounded-lg hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              <FiLogIn />
              ログインしてダッシュボードへ
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiUpload className="text-4xl text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">かんたん操作</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              画像をドラッグ&ドロップするだけで、クラウドに保存して整理
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiImage className="text-4xl text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">美術館品質</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              世界の美術館・図書館で使われている国際規格（IIIF）に対応
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiLock className="text-4xl text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">安全な共有</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              公開・非公開を選択でき、大切な画像を安全に管理
            </p>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">こんな方におすすめ</h2>
          <ul className="text-left max-w-2xl mx-auto space-y-3">
            <li className="flex items-start">
              <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
              <span>研究資料や作品集を整理して公開したい研究者・アーティスト</span>
            </li>
            <li className="flex items-start">
              <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
              <span>デジタルアーカイブを構築したい図書館・博物館・美術館</span>
            </li>
            <li className="flex items-start">
              <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
              <span>写真コレクションを整理して共有したい個人の方</span>
            </li>
            <li className="flex items-start">
              <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
              <span>高品質な画像ビューアで作品を展示したいクリエイター</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}