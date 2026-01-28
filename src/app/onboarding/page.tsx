'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CURRENCIES } from '@/lib/constants/currencies';
import {
  initializeUserKey,
  getRecoveryPhrase,
  hasUserKey,
} from '@/lib/services/key-management-service';

type OnboardingStep = 'encryption' | 'backup' | 'currency';

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>('encryption');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  // Redirect to home if user already completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      // Check if user has set currency (completed onboarding)
      const response = await fetch('/api/user/currency');
      if (response.ok) {
        const data = await response.json();
        if (data.currency) {
          // User completed onboarding, redirect to home
          router.push('/');
        }
      }
    };
    checkOnboarding();
  }, [router]);

  const handleInitializeEncryption = async () => {
    setIsLoading(true);
    try {
      // Generate encryption key
      await initializeUserKey();

      // Get recovery phrase for backup
      const phrase = await getRecoveryPhrase();
      setRecoveryPhrase(phrase);

      setStep('backup');
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      alert('Failed to initialize encryption. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(recoveryPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleConfirmBackup = () => {
    if (!confirmed) {
      alert('Please confirm that you have saved your recovery phrase!');
      return;
    }
    setStep('currency');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/user/currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currency: selectedCurrency }),
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        console.error('Failed to set currency');
      }
    } catch (error) {
      console.error('Error setting currency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Encryption Setup Step
  if (step === 'encryption') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-900">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Secure Your Financial Data
            </h1>
            <p className="mt-2 text-base text-gray-600">
              End-to-end encryption keeps your data private
            </p>
          </div>

          <div className="space-y-4 rounded-lg bg-gray-50 p-6">
            <div className="flex items-start space-x-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-medium text-gray-900">Your eyes only</p>
                <p className="text-sm text-gray-600">
                  Only you can see your financial data
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="font-medium text-gray-900">
                  Zero-knowledge architecture
                </p>
                <p className="text-sm text-gray-600">
                  We cannot access your data, even if we wanted to
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="font-medium text-gray-900">
                  Military-grade encryption
                </p>
                <p className="text-sm text-gray-600">
                  AES-256 GCM encryption protects your information
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleInitializeEncryption}
            disabled={isLoading}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Initializing...' : 'Initialize Encryption'}
          </button>
        </div>
      </div>
    );
  }

  // Backup Recovery Phrase Step
  if (step === 'backup') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Save Your Recovery Phrase
            </h1>
            <p className="mt-2 text-base text-red-600 font-medium">
              This is your only backup! Write it down and store it safely.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6">
              <p className="mb-3 text-sm font-medium text-gray-900">
                Your Recovery Phrase:
              </p>
              <div className="rounded-md bg-white p-4 font-mono text-sm break-all border border-gray-300">
                {recoveryPhrase}
              </div>
              <button
                onClick={handleCopyPhrase}
                className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                {copied ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
            </div>

            <div className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              <p className="font-bold">⚠️ Important Warning:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Loss of this phrase means{' '}
                  <strong>permanent loss of all your data</strong>
                </li>
                <li>We cannot recover your data without this phrase</li>
                <li>Store it in a password manager or write it on paper</li>
                <li>Never share this phrase with anyone</li>
              </ul>
            </div>

            <div className="flex items-start space-x-3 rounded-lg border-2 border-gray-200 p-4">
              <input
                type="checkbox"
                id="confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="confirm" className="text-sm text-gray-700">
                I have saved my recovery phrase in a safe place and understand
                that losing it means losing access to my data forever.
              </label>
            </div>
          </div>

          <button
            onClick={handleConfirmBackup}
            disabled={!confirmed}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            I Have Saved My Recovery Phrase
          </button>
        </div>
      </div>
    );
  }

  // Currency Selection Step
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to Mak Money
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Lets start by choosing your main currency
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="currency"
              className="block text-sm font-medium text-gray-700"
            >
              Main Currency
            </label>
            <select
              id="currency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              disabled={isLoading}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code} - {currency.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              You can change this later in settings
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
