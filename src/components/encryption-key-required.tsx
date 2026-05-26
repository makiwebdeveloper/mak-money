"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { restoreFromRecoveryPhrase } from "@/lib/services/key-management-service";

export function EncryptionKeyRequired() {
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleImport = async () => {
    const phrase = recoveryPhrase.trim();
    if (!phrase || isImporting) return;

    setIsImporting(true);
    try {
      await restoreFromRecoveryPhrase(phrase);
      await queryClient.invalidateQueries();
      router.refresh();
    } catch (error) {
      console.error("Failed to import encryption key:", error);
      alert("Invalid recovery phrase. Please check it and try again.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 px-3 py-12 sm:px-4">
      <div className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Encryption Key Required
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This browser does not have the local key for this account. Paste
            your recovery phrase to decrypt your data on this device.
          </p>
        </div>

        <label
          htmlFor="recovery-phrase"
          className="block text-sm font-medium text-gray-700"
        >
          Recovery Phrase
        </label>
        <textarea
          id="recovery-phrase"
          rows={4}
          value={recoveryPhrase}
          onChange={(event) => setRecoveryPhrase(event.target.value)}
          placeholder="Paste your recovery phrase here..."
          className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />

        <button
          onClick={handleImport}
          disabled={isImporting || !recoveryPhrase.trim()}
          className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isImporting ? "Importing..." : "Import Recovery Phrase"}
        </button>
      </div>
    </div>
  );
}
