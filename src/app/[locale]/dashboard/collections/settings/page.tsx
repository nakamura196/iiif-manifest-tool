'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiSave, FiInfo } from 'react-icons/fi';
import Link from 'next/link';

interface SettingsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

interface UserSettings {
  publicCollectionTitle: {
    ja: string;
    en: string;
  };
  publicCollectionDescription: {
    ja: string;
    en: string;
  };
}

export default function PublicCollectionSettingsPage({ params }: SettingsPageProps) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    publicCollectionTitle: {
      ja: 'マイコレクション',
      en: 'My Collections'
    },
    publicCollectionDescription: {
      ja: 'あなたの画像コレクションを管理できます',
      en: 'Manage your image collections'
    }
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    } else if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        router.push(`/${resolvedParams.locale}/dashboard`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/${resolvedParams.locale}/dashboard`}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiArrowLeft className="text-xl" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">公開コレクション設定</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
              >
                <FiSave />
                <span className="hidden sm:inline">{saving ? '保存中...' : '保存'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <FiInfo className="text-xl text-blue-500" />
              <h2 className="text-lg font-semibold">公開コレクションの表示設定</h2>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Self Museumなどの外部ビューアで表示される、あなたの公開コレクション全体のタイトルと説明を設定できます。
            </p>

            <div className="space-y-6">
              {/* Japanese Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">日本語設定</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    タイトル
                  </label>
                  <input
                    type="text"
                    value={settings.publicCollectionTitle.ja}
                    onChange={(e) => setSettings({
                      ...settings,
                      publicCollectionTitle: {
                        ...settings.publicCollectionTitle,
                        ja: e.target.value
                      }
                    })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="例: 私のコレクション"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    説明
                  </label>
                  <textarea
                    value={settings.publicCollectionDescription.ja}
                    onChange={(e) => setSettings({
                      ...settings,
                      publicCollectionDescription: {
                        ...settings.publicCollectionDescription,
                        ja: e.target.value
                      }
                    })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                    placeholder="コレクションの説明を入力"
                  />
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              {/* English Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">English Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={settings.publicCollectionTitle.en}
                    onChange={(e) => setSettings({
                      ...settings,
                      publicCollectionTitle: {
                        ...settings.publicCollectionTitle,
                        en: e.target.value
                      }
                    })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g. My Collections"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={settings.publicCollectionDescription.en}
                    onChange={(e) => setSettings({
                      ...settings,
                      publicCollectionDescription: {
                        ...settings.publicCollectionDescription,
                        en: e.target.value
                      }
                    })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                    placeholder="Enter collection description"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                この設定は、公開コレクション全体のIIIFマニフェストに反映されます。
                個別のコレクションの設定は、各コレクションの編集画面から変更できます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}