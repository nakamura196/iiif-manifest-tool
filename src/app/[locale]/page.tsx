'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FiImage, FiUpload, FiLock, FiGlobe } from 'react-icons/fi';

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/ja/dashboard');
    }
  }, [session, router]);

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">
          IIIF Manifest Tool
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
          画像をドラッグ&ドロップしてIIIFマニフェストを簡単作成
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiUpload className="text-4xl text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">簡単アップロード</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              画像をドラッグ&ドロップするだけで、mdxオブジェクトストレージにアップロード
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiImage className="text-4xl text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">IIIF対応</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              IIIF Presentation API 3.0準拠のマニフェストを自動生成
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FiLock className="text-4xl text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">アクセス制御</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              公開/非公開の設定とIIIF Auth APIによる認証機能
            </p>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">機能</h2>
          <ul className="text-left max-w-2xl mx-auto space-y-3">
            <li className="flex items-start">
              <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
              <span>Googleアカウントでログインして、個人のコレクションを管理</span>
            </li>
            <li className="flex items-start">
              <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
              <span>画像URL、IIIF info.jsonからも画像を追加可能</span>
            </li>
            <li className="flex items-start">
              <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
              <span>コレクションとアイテム単位での整理</span>
            </li>
            <li className="flex items-start">
              <FiGlobe className="mr-3 mt-1 text-blue-500 shrink-0" />
              <span>マニフェストURLをコピーして外部ビューアで表示</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}