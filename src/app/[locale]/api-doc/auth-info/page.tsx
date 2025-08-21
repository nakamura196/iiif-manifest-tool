'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FiCopy, FiCheck, FiInfo, FiKey } from 'react-icons/fi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function AuthInfoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || 'ja';
  const t = useTranslations('ApiAuth');
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
        <div className="text-lg">{t('loading')}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FiInfo className="text-blue-500" />
          {t('userInfo.title')}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('userInfo.userId')}
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
              {t('userInfo.email')}
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
          {t('authMethod.title')}
        </h2>
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              {t('authMethod.currentSession')}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('authMethod.sessionDescription')}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">{t('authMethod.programmaticAccess')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t('authMethod.programmaticDescription')}
            </p>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <div>
                  <strong>{t('authMethod.cookieAuth')}:</strong> {t('authMethod.cookieAuthDescription')}
                </div>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <div>
                  <strong>{t('authMethod.bearerToken')}:</strong> {t('authMethod.bearerTokenDescription')}
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('usage.title')}</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <div>
              {t('usage.step1')}
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <div>
              {t('usage.step2')}
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <div>
              {t('usage.step3')}
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <div>
              {t('usage.step4')}
            </div>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <div>
              {t('usage.step5')}
            </div>
          </li>
        </ol>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">{t('notes.title')}</h3>
        <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
          <li>• {t('notes.note1')}</li>
          <li>• {t('notes.note2')}</li>
          <li>• {t('notes.note3')}</li>
          <li>• {t('notes.note4')}</li>
        </ul>
      </div>

      <div className="mt-6 flex gap-4">
        <Link
          href={`/${locale}/api-doc`}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {t('openSwagger')}
        </Link>
        <Link
          href={`/${locale}/dashboard`}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          {t('backToDashboard')}
        </Link>
      </div>
    </div>
  );
}