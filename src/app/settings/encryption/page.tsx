'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getRecoveryPhrase,
  importUserKey,
  deleteUserKey,
  hasUserKey,
} from '@/lib/services/key-management-service';

export default function EncryptionSettingsPage() {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'danger'>(
    'export',
  );
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [importPhrase, setImportPhrase] = useState('');
  const [showPhrase, setShowPhrase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const phrase = await getRecoveryPhrase();
      setRecoveryPhrase(phrase);
      setShowPhrase(true);
    } catch (error) {
      console.error('Failed to export key:', error);
      alert('Failed to export recovery phrase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleImport = async () => {
    if (!importPhrase.trim()) {
      alert('Please enter a recovery phrase');
      return;
    }

    setIsLoading(true);
    try {
      await importUserKey(importPhrase.trim());
      alert(
        'Recovery phrase imported successfully! Your data should now be accessible.',
      );
      setImportPhrase('');
      router.refresh();
    } catch (error) {
      console.error('Failed to import key:', error);
      alert('Invalid recovery phrase format. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmation = window.prompt(
      'This will permanently delete your encryption key and make all your data inaccessible. Type "DELETE" to confirm:',
    );

    if (confirmation !== 'DELETE') {
      return;
    }

    const doubleCheck = window.confirm(
      'Are you absolutely sure? This action CANNOT be undone and you will LOSE ALL YOUR DATA!',
    );

    if (!doubleCheck) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteUserKey();
      alert(
        'Encryption key deleted. You will need to set up encryption again.',
      );
      router.push('/onboarding');
    } catch (error) {
      console.error('Failed to delete key:', error);
      alert('Failed to delete encryption key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Encryption Settings
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your encryption keys and data security
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 text-sm font-medium ${
              activeTab === 'export'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Export Key
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 text-sm font-medium ${
              activeTab === 'import'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Import Key
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`pb-3 text-sm font-medium ${
              activeTab === 'danger'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-6 rounded-lg bg-white p-6 shadow">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Export Recovery Phrase
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Use this phrase to restore your encryption key on a new device
                or browser.
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-xl">ℹ️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Keep this phrase safe!
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc space-y-1 pl-5">
                      <li>Store it in a password manager</li>
                      <li>Write it down and keep it in a safe place</li>
                      <li>Never share it with anyone</li>
                      <li>Anyone with this phrase can access your data</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {!showPhrase ? (
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isLoading ? 'Exporting...' : 'Show Recovery Phrase'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-medium text-gray-700">
                    Your Recovery Phrase:
                  </p>
                  <div className="rounded-md bg-white p-4 font-mono text-sm break-all">
                    {recoveryPhrase}
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                  </button>
                  <button
                    onClick={() => setShowPhrase(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Hide
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-6 rounded-lg bg-white p-6 shadow">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Import Recovery Phrase
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Restore your encryption key from a previously exported recovery
                phrase.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Before importing
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      Importing a new key will replace your current encryption
                      key. Make sure you have backed up your current key if
                      needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="import-phrase"
                className="block text-sm font-medium text-gray-700"
              >
                Recovery Phrase
              </label>
              <textarea
                id="import-phrase"
                rows={4}
                value={importPhrase}
                onChange={(e) => setImportPhrase(e.target.value)}
                placeholder="Paste your recovery phrase here..."
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <button
              onClick={handleImport}
              disabled={isLoading || !importPhrase.trim()}
              className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Importing...' : 'Import Recovery Phrase'}
            </button>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="space-y-6 rounded-lg border-2 border-red-200 bg-white p-6 shadow">
            <div>
              <h2 className="text-xl font-semibold text-red-600">
                ⚠️ Danger Zone
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Irreversible and destructive actions
              </p>
            </div>

            <div className="rounded-lg bg-red-50 p-4">
              <h3 className="text-sm font-medium text-red-800">
                Delete Encryption Key
              </h3>
              <p className="mt-2 text-sm text-red-700">
                This will permanently delete your encryption key. All your
                financial data will become inaccessible and cannot be recovered
                without a backup of your recovery phrase.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
                <li>All encrypted data will be permanently inaccessible</li>
                <li>You will need to set up encryption again</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete Encryption Key'}
            </button>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 rounded-lg bg-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900">
            About End-to-End Encryption
          </h3>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <p>
              <strong>🔐 Your data is encrypted:</strong> All sensitive
              financial information is encrypted on your device before being
              sent to our servers.
            </p>
            <p>
              <strong>🚫 We cannot access your data:</strong> We never have
              access to your encryption key, which means we cannot decrypt or
              view your data.
            </p>
            <p>
              <strong>💾 You control your data:</strong> Only you have the key
              to decrypt your information. Keep your recovery phrase safe!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
