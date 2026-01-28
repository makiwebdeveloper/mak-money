/**
 * EXAMPLE: Encrypted version of useAccounts hook
 * 
 * This demonstrates how to modify React hooks to decrypt data on the client side.
 * All decryption happens in the browser using the user's key.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccountEncryption } from "@/lib/hooks/useEncryption";
import { useState, useEffect } from "react";
import type { DecryptedAccount } from "@/lib/types/database";
import type { EncryptedData } from "@/lib/services/encryption-service";

// Query keys
export const accountKeys = {
  all: ["accounts"] as const,
  lists: () => [...accountKeys.all, "list"] as const,
  list: (filters?: any) => [...accountKeys.lists(), filters] as const,
  details: () => [...accountKeys.all, "detail"] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
  balance: () => [...accountKeys.all, "balance"] as const,
};

// Fetch and decrypt accounts
export function useAccounts() {
  const { decryptAccountRow } = useAccountEncryption();
  
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: async (): Promise<DecryptedAccount[]> => {
      // Fetch encrypted data from server
      const response = await fetch("/api/accounts");
      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }
      const { accounts } = await response.json();
      
      // Decrypt all accounts on client side
      const decrypted = await Promise.all(
        (accounts || []).map(async (account: any) => {
          try {
            return await decryptAccountRow(account);
          } catch (error) {
            console.error("Failed to decrypt account:", account.id, error);
            return null;
          }
        })
      );
      
      // Filter out failed decryptions
      return decrypted.filter((acc): acc is DecryptedAccount => acc !== null);
    },
  });
}

// Create encrypted account
export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { encryptAccount } = useAccountEncryption();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      balance: number;
      type?: string;
      currency: string;
      exclude_from_free?: boolean;
    }) => {
      // Encrypt sensitive data on client
      const encrypted_data = await encryptAccount(input.name, input.balance);
      
      // Send encrypted data to server
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          encrypted_data,
          type: input.type || "other",
          currency: input.currency,
          exclude_from_free: input.exclude_from_free || false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create account");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

// Update encrypted account
export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const { encryptAccount } = useAccountEncryption();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      balance?: number;
      type?: string;
      currency?: string;
      is_active?: boolean;
      exclude_from_free?: boolean;
    }) => {
      // If name or balance changed, re-encrypt
      let encrypted_data: EncryptedData | undefined;
      
      if (input.name !== undefined || input.balance !== undefined) {
        // Need to fetch current data first to get missing fields
        // Or require both name and balance in update
        if (input.name === undefined || input.balance === undefined) {
          throw new Error("Must provide both name and balance for update");
        }
        
        encrypted_data = await encryptAccount(input.name, input.balance);
      }
      
      const response = await fetch(`/api/accounts/${input.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(encrypted_data && { encrypted_data }),
          ...(input.type && { type: input.type }),
          ...(input.currency && { currency: input.currency }),
          ...(input.is_active !== undefined && { is_active: input.is_active }),
          ...(input.exclude_from_free !== undefined && { 
            exclude_from_free: input.exclude_from_free 
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update account");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

// Delete account (no decryption needed)
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

// Calculate total balance on client side (after decryption)
export function useTotalBalance() {
  const { data: accounts, isLoading } = useAccounts();
  const [totalBalance, setTotalBalance] = useState(0);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (!accounts || accounts.length === 0) {
      setTotalBalance(0);
      return;
    }

    // Sum all account balances (already decrypted)
    // Note: This is a simple sum - in production you'd want to convert currencies
    const total = accounts.reduce((sum, account) => {
      return sum + (account.balance || 0);
    }, 0);

    setTotalBalance(total);
    
    // Use currency from first account or user's default
    if (accounts[0]) {
      setCurrency(accounts[0].currency);
    }
  }, [accounts]);

  return {
    totalBalance,
    currency,
    accountsCount: accounts?.length || 0,
    isLoading,
  };
}

// Restore account (soft delete)
export function useRestoreAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore account");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
