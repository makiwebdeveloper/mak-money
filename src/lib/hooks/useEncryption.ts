/**
 * React hook for encryption operations
 * 
 * Provides convenient access to encryption/decryption functionality
 * for React components with proper error handling and loading states.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  encryptData,
  decryptData,
  encryptField,
  decryptField,
  type EncryptedData,
} from '../services/encryption-service';
import {
  getCachedUserKey,
  hasUserKey,
  clearKeyCache,
} from '../services/key-management-service';
import type {
  EncryptedAccountData,
  EncryptedTransactionData,
  EncryptedPoolData,
  EncryptedAllocationData,
  DecryptedAccount,
  DecryptedTransaction,
  DecryptedPool,
  DecryptedAllocation,
} from '../types/database';

export function useEncryption() {
  const [isKeyAvailable, setIsKeyAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkKeyAvailability();
  }, []);

  const checkKeyAvailability = async () => {
    try {
      const hasKey = await hasUserKey();
      setIsKeyAvailable(hasKey);
    } catch (error) {
      console.error('Failed to check key availability:', error);
      setIsKeyAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const encrypt = useCallback(async <T,>(data: T): Promise<EncryptedData> => {
    const key = await getCachedUserKey();
    if (!key) {
      throw new Error('Encryption key not available');
    }
    return await encryptData(data, key);
  }, []);

  const decrypt = useCallback(
    async <T,>(encryptedData: EncryptedData): Promise<T> => {
      const key = await getCachedUserKey();
      if (!key) {
        throw new Error('Encryption key not available');
      }
      return await decryptData<T>(encryptedData, key);
    },
    []
  );

  const clearCache = useCallback(() => {
    clearKeyCache();
    setIsKeyAvailable(null);
  }, []);

  const refreshKeyStatus = useCallback(() => {
    checkKeyAvailability();
  }, []);

  return {
    encrypt,
    decrypt,
    isKeyAvailable,
    isLoading,
    clearCache,
    refreshKeyStatus,
  };
}

/**
 * Hook for encrypting/decrypting accounts
 */
export function useAccountEncryption() {
  const { encrypt, decrypt } = useEncryption();

  const encryptAccount = useCallback(
    async (name: string, balance: number): Promise<EncryptedData> => {
      const data: EncryptedAccountData = { name, balance };
      return await encrypt(data);
    },
    [encrypt]
  );

  const decryptAccount = useCallback(
    async (
      encryptedData: EncryptedData
    ): Promise<EncryptedAccountData> => {
      return await decrypt<EncryptedAccountData>(encryptedData);
    },
    [decrypt]
  );

  const decryptAccountRow = useCallback(
    async (
      row: {
        id: string;
        user_id: string;
        type: string;
        currency: string;
        is_active: boolean;
        exclude_from_free: boolean;
        created_at: string;
        updated_at: string;
        encrypted_data: EncryptedData | null;
      }
    ): Promise<DecryptedAccount | null> => {
      if (!row.encrypted_data) {
        return null;
      }

      const decrypted = await decryptAccount(row.encrypted_data);
      
      return {
        id: row.id,
        user_id: row.user_id,
        name: decrypted.name,
        type: row.type as any,
        currency: row.currency,
        balance: decrypted.balance,
        is_active: row.is_active,
        exclude_from_free: row.exclude_from_free,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    },
    [decryptAccount]
  );

  return {
    encryptAccount,
    decryptAccount,
    decryptAccountRow,
  };
}

/**
 * Hook for encrypting/decrypting transactions
 */
export function useTransactionEncryption() {
  const { encrypt, decrypt } = useEncryption();

  const encryptTransaction = useCallback(
    async (
      amount: number,
      category?: string | null,
      description?: string | null
    ): Promise<EncryptedData> => {
      const data: EncryptedTransactionData = { amount, category, description };
      return await encrypt(data);
    },
    [encrypt]
  );

  const decryptTransaction = useCallback(
    async (
      encryptedData: EncryptedData
    ): Promise<EncryptedTransactionData> => {
      return await decrypt<EncryptedTransactionData>(encryptedData);
    },
    [decrypt]
  );

  const decryptTransactionRow = useCallback(
    async (
      row: {
        id: string;
        user_id: string;
        type: string;
        currency: string;
        account_id: string | null;
        from_account_id: string | null;
        to_account_id: string | null;
        transaction_date: string;
        created_at: string;
        updated_at: string;
        encrypted_data: EncryptedData | null;
      }
    ): Promise<DecryptedTransaction | null> => {
      if (!row.encrypted_data) {
        return null;
      }

      const decrypted = await decryptTransaction(row.encrypted_data);
      
      return {
        id: row.id,
        user_id: row.user_id,
        type: row.type as any,
        amount: decrypted.amount,
        currency: row.currency,
        account_id: row.account_id,
        from_account_id: row.from_account_id,
        to_account_id: row.to_account_id,
        category: decrypted.category ?? null,
        description: decrypted.description ?? null,
        transaction_date: row.transaction_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    },
    [decryptTransaction]
  );

  return {
    encryptTransaction,
    decryptTransaction,
    decryptTransactionRow,
  };
}

/**
 * Hook for encrypting/decrypting money pools
 */
export function usePoolEncryption() {
  const { encrypt, decrypt } = useEncryption();

  const encryptPool = useCallback(
    async (name: string): Promise<EncryptedData> => {
      const data: EncryptedPoolData = { name };
      return await encrypt(data);
    },
    [encrypt]
  );

  const decryptPool = useCallback(
    async (encryptedData: EncryptedData): Promise<EncryptedPoolData> => {
      return await decrypt<EncryptedPoolData>(encryptedData);
    },
    [decrypt]
  );

  const decryptPoolRow = useCallback(
    async (
      row: {
        id: string;
        user_id: string;
        type: string;
        color: string;
        icon: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        encrypted_data: EncryptedData | null;
      }
    ): Promise<DecryptedPool | null> => {
      if (!row.encrypted_data) {
        return null;
      }

      const decrypted = await decryptPool(row.encrypted_data);
      
      return {
        id: row.id,
        user_id: row.user_id,
        name: decrypted.name,
        type: row.type as any,
        color: row.color,
        icon: row.icon,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    },
    [decryptPool]
  );

  return {
    encryptPool,
    decryptPool,
    decryptPoolRow,
  };
}

/**
 * Hook for encrypting/decrypting allocations
 */
export function useAllocationEncryption() {
  const { encrypt, decrypt } = useEncryption();

  const encryptAllocation = useCallback(
    async (amount: number): Promise<EncryptedData> => {
      const data: EncryptedAllocationData = { amount };
      return await encrypt(data);
    },
    [encrypt]
  );

  const decryptAllocation = useCallback(
    async (
      encryptedData: EncryptedData
    ): Promise<EncryptedAllocationData> => {
      return await decrypt<EncryptedAllocationData>(encryptedData);
    },
    [decrypt]
  );

  const decryptAllocationRow = useCallback(
    async (
      row: {
        id: string;
        user_id: string;
        account_id: string;
        pool_id: string;
        created_at: string;
        updated_at: string;
        encrypted_data: EncryptedData | null;
      }
    ): Promise<DecryptedAllocation | null> => {
      if (!row.encrypted_data) {
        return null;
      }

      const decrypted = await decryptAllocation(row.encrypted_data);
      
      return {
        id: row.id,
        user_id: row.user_id,
        account_id: row.account_id,
        pool_id: row.pool_id,
        amount: decrypted.amount,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    },
    [decryptAllocation]
  );

  return {
    encryptAllocation,
    decryptAllocation,
    decryptAllocationRow,
  };
}
