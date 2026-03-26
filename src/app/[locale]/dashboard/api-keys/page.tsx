'use client';

import { useAuth } from '@/components/providers/FirebaseAuthProvider';
import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiKey, FiPlus, FiTrash2, FiCopy, FiCheck, FiAlertTriangle, FiChevronDown, FiChevronUp, FiLoader } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface ApiToken {
  tokenHash: string;
  name: string;
  lastFour: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export default function ApiKeysPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('ApiKeys');
  const tCommon = useTranslations('Common');
  const { showSnackbar } = useSnackbar();

  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState<string>('none');
  const [creating, setCreating] = useState(false);

  // Newly created token display
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Revoke dialog
  const [revokeDialog, setRevokeDialog] = useState<{
    isOpen: boolean;
    tokenHash: string;
    name: string;
    isLoading: boolean;
  }>({ isOpen: false, tokenHash: '', name: '', isLoading: false });

  // API usage section
  const [showUsageExamples, setShowUsageExamples] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchTokens();
    }
  }, [user]);

  const fetchTokens = async () => {
    try {
      const response = await apiFetch('/api/auth/api-token');
      if (response.ok) {
        const data = await response.json();
        setTokens(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching API tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTokenName.trim()) return;
    setCreating(true);

    const expiresInDays = newTokenExpiry === 'none' ? undefined
      : newTokenExpiry === '30' ? 30
      : newTokenExpiry === '90' ? 90
      : newTokenExpiry === '365' ? 365
      : undefined;

    try {
      const response = await apiFetch('/api/auth/api-token', {
        method: 'POST',
        body: JSON.stringify({
          name: newTokenName.trim(),
          expiresInDays,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedToken(data.data.token);
        setNewTokenName('');
        setNewTokenExpiry('none');
        setShowCreateModal(false);
        await fetchTokens();
      } else {
        const error = await response.json();
        showSnackbar(error.error || t('createError'), 'error');
      }
    } catch (error) {
      console.error('Error creating API token:', error);
      showSnackbar(t('createError'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (tokenHash: string) => {
    setRevokeDialog(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await apiFetch('/api/auth/api-token', {
        method: 'DELETE',
        body: JSON.stringify({ tokenHash }),
      });

      if (response.ok) {
        setTokens(tokens.filter(t => t.tokenHash !== tokenHash));
        showSnackbar(t('revokeSuccess'), 'success');
        setRevokeDialog({ isOpen: false, tokenHash: '', name: '', isLoading: false });
      } else {
        const error = await response.json();
        showSnackbar(error.error || t('revokeError'), 'error');
        setRevokeDialog(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error revoking API token:', error);
      showSnackbar(t('revokeError'), 'error');
      setRevokeDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{tCommon('loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
            {t('description')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
        >
          <FiPlus />
          <span>{t('createButton')}</span>
        </button>
      </div>

      {/* Newly created token display */}
      {createdToken && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-yellow-500 mt-1 flex-shrink-0" size={20} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                {t('tokenCreated')}
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                {t('tokenWarning')}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white dark:bg-gray-800 border rounded text-sm font-mono break-all">
                  {createdToken}
                </code>
                <button
                  onClick={() => copyToClipboard(createdToken)}
                  className="flex-shrink-0 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  title={t('copy')}
                >
                  {copiedToken ? <FiCheck /> : <FiCopy />}
                </button>
              </div>
              {copiedToken && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">{t('copied')}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setCreatedToken(null)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
            >
              {t('dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Token list */}
      {tokens.length === 0 ? (
        <div className="text-center py-12">
          <FiKey className="mx-auto text-6xl text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('noTokens')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('createFirst')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {t('columnName')}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {t('columnToken')}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {t('columnCreated')}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    {t('columnExpiry')}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                    {t('columnLastUsed')}
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {t('columnActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr
                    key={token.tokenHash}
                    className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {token.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-gray-500 dark:text-gray-400">
                        pkt_...{token.lastFour}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {formatDate(token.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {token.expiresAt ? formatDate(token.expiresAt) : t('noExpiry')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {token.lastUsedAt ? formatDate(token.lastUsedAt) : t('neverUsed')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          setRevokeDialog({
                            isOpen: true,
                            tokenHash: token.tokenHash,
                            name: token.name,
                            isLoading: false,
                          })
                        }
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={t('revoke')}
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Usage Examples */}
      <div className="mt-8">
        <button
          onClick={() => setShowUsageExamples(!showUsageExamples)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {showUsageExamples ? <FiChevronUp /> : <FiChevronDown />}
          {t('usageTitle')}
        </button>
        {showUsageExamples && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('usageDescription')}
            </p>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                {t('usageListCollections')}
              </h4>
              <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`curl -H "Authorization: Bearer pkt_xxxxx" \\
  https://pocket.webcatplus.jp/api/collections`}
              </pre>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                {t('usageCreateCollection')}
              </h4>
              <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`curl -X POST -H "Authorization: Bearer pkt_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Collection","isPublic":true}' \\
  https://pocket.webcatplus.jp/api/collections`}
              </pre>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                {t('usageCreateItem')}
              </h4>
              <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`curl -X POST -H "Authorization: Bearer pkt_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"title":{"ja":["画像名"]}, "iiifBaseUrl":"https://...", "width":1000, "height":800, "physicalWidthCm":30.0, "physicalHeightCm":24.0, "isPublic":true}' \\
  https://pocket.webcatplus.jp/api/collections/{collectionId}/items`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                {t('createTitle')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('tokenName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder={t('tokenNamePlaceholder')}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('expiration')}
                  </label>
                  <select
                    value={newTokenExpiry}
                    onChange={(e) => setNewTokenExpiry(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="none">{t('expiryNone')}</option>
                    <option value="30">{t('expiry30')}</option>
                    <option value="90">{t('expiry90')}</option>
                    <option value="365">{t('expiry365')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTokenName('');
                  setNewTokenExpiry('none');
                }}
                disabled={creating}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newTokenName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating && <FiLoader className="animate-spin" />}
                {creating ? t('creating') : t('create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirm Dialog */}
      <ConfirmDialog
        isOpen={revokeDialog.isOpen}
        onClose={() => setRevokeDialog({ isOpen: false, tokenHash: '', name: '', isLoading: false })}
        onConfirm={() => handleRevoke(revokeDialog.tokenHash)}
        title={t('revokeTitle')}
        message={t('revokeMessage', { name: revokeDialog.name })}
        confirmText={t('revoke')}
        cancelText={tCommon('cancel')}
        variant="danger"
        isLoading={revokeDialog.isLoading}
      />
    </div>
  );
}
