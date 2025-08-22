'use client';

import { useSession, signIn } from 'next-auth/react';
import { FiImage, FiUpload, FiLock, FiGlobe, FiArrowRight, FiLogIn, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function HomePage() {
  const { data: session } = useSession();
  const locale = useLocale();
  
  const content = locale === 'ja' ? {
    title: '画像コレクション管理ツール',
    subtitle: '画像をまとめて整理・公開・共有できるサービス',
    demoNotice: 'デモ版についてのご注意',
    demoDescription: '本アプリケーションはデモ目的で提供されています。アップロードされた画像は永続的に保管されませんので、重要なデータの保存にはご利用をお控えください。',
    loginPrompt: 'ログインして、あなたの画像コレクションを管理しましょう',
    loginButton: 'ログインしてダッシュボードへ',
    dashboardButton: 'ダッシュボードへ',
    features: {
      easy: { title: 'かんたん操作', desc: '画像をドラッグ&ドロップするだけで、クラウドに保存して整理' },
      quality: { title: '国際規格対応', desc: '世界の美術館・図書館で使われている国際規格（IIIF）に対応' },
      secure: { title: '安全な共有', desc: '公開・非公開を選択でき、大切な画像を安全に管理' }
    },
    recommended: 'こんな方におすすめ',
    useCases: [
      '研究資料や作品集を整理して公開したい研究者・アーティスト',
      'デジタルアーカイブを構築したい図書館・博物館・美術館',
      '写真コレクションを整理して共有したい個人の方',
      '高品質な画像ビューアで作品を展示したいクリエイター'
    ]
  } : {
    title: 'Image Collection Manager',
    subtitle: 'Organize, publish, and share your image collections',
    demoNotice: 'Demo Version Notice',
    demoDescription: 'This application is provided for demonstration purposes. Uploaded images are not permanently stored, so please do not use it for important data.',
    loginPrompt: 'Sign in to manage your image collections',
    loginButton: 'Sign in to Dashboard',
    dashboardButton: 'Go to Dashboard',
    features: {
      easy: { title: 'Easy to Use', desc: 'Simply drag & drop images to save and organize in the cloud' },
      quality: { title: 'International Standard', desc: 'Compatible with IIIF, the international standard used by museums and libraries worldwide' },
      secure: { title: 'Secure Sharing', desc: 'Choose between public and private settings to safely manage your precious images' }
    },
    recommended: 'Recommended for',
    useCases: [
      'Researchers and artists who want to organize and publish research materials and portfolios',
      'Libraries, museums, and galleries looking to build digital archives',
      'Individuals who want to organize and share photo collections',
      'Creators who want to showcase their work with a high-quality image viewer'
    ]
  };

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">
          {content.title}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          {content.subtitle}
        </p>
        
        {/* デモ版の注意 */}
        <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-amber-800 dark:text-amber-300 mb-2">
            <FiAlertCircle className="text-xl" />
            <h3 className="font-semibold">{content.demoNotice}</h3>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {content.demoDescription}
          </p>
        </div>

        {session ? (
          <div className="mb-12">
            <Link
              href={`/${locale}/dashboard`}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 text-white text-base sm:text-lg rounded-lg hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              {content.dashboardButton}
              <FiArrowRight />
            </Link>
          </div>
        ) : (
          <div className="mb-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-4">
              {content.loginPrompt}
            </p>
            <button
              onClick={() => signIn()}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 text-white text-base sm:text-lg rounded-lg hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              <FiLogIn />
              {content.loginButton}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiUpload className="text-4xl text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{content.features.easy.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {content.features.easy.desc}
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiImage className="text-4xl text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{content.features.quality.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {content.features.quality.desc}
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiLock className="text-4xl text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{content.features.secure.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {content.features.secure.desc}
            </p>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">{content.recommended}</h2>
          <ul className="text-left max-w-2xl mx-auto space-y-3">
            {content.useCases.map((useCase, index) => (
              <li key={index} className="flex items-start">
                <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}