import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, DecryptedAccount } from "@/lib/types/database";
import { CurrencyCode } from "@/lib/constants/currencies";
import { useAccountEncryption } from "./useEncryption";

type AccountType = Database["public"]["Tables"]["accounts"]["Row"]["type"];

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

// Fetch total balance (calculated on client after decryption)
export function useTotalBalance() {
  const { data: accounts, isLoading } = useAccounts();
  
  const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const currency = accounts?.[0]?.currency || "USD";
  const accountsCount = accounts?.length || 0;

  return {
    data: { totalBalance, currency, accountsCount },
    isLoading,
  };
}

// Create encrypted account
export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { encryptAccount } = useAccountEncryption();

  return useMutation({
    mutationFn: async (formData: {
      name: string;
      type: AccountType;
      currency: CurrencyCode;
      balance: number;
      exclude_from_free?: boolean;
    }) => {
      // Encrypt sensitive data on client
      const encrypted_data = await encryptAccount(formData.name, formData.balance);
      
      // Send encrypted data to server
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted_data,
          type: formData.type,
          currency: formData.currency,
          exclude_from_free: formData.exclude_from_free || false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create account");
      }

      return response.json();
    },
    onMutate: async (newAccount) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: accountKeys.list() });

      // Snapshot previous value
      const previousAccounts = queryClient.getQueryData<DecryptedAccount[]>(
        accountKeys.list(),
      );

      // Optimistically update with decrypted data
      queryClient.setQueryData<DecryptedAccount[]>(accountKeys.list(), (old) => {
        if (!old) return old;
        const optimisticAccount: DecryptedAccount = {
          id: `temp-${Date.now()}`,
          user_id: "",
          name: newAccount.name,
          type: newAccount.type,
          currency: newAccount.currency,
          balance: newAccount.balance,
          is_active: true,
          exclude_from_free: newAccount.exclude_from_free || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [...old, optimisticAccount];
      });

      return { previousAccounts };
    },
    onError: (err, newAccount, context) => {
      // Rollback on error
      if (context?.previousAccounts) {
        queryClient.setQueryData(accountKeys.list(), context.previousAccounts);
      }
    },
    onSuccess: () => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: accountKeys.list() });
      // Also invalidate pools since Free pool balance depends on accounts
      queryClient.invalidateQueries({ queryKey: ["pools"] });
      // Invalidate free balance
      queryClient.invalidateQueries({ queryKey: ["pools", "freeBalance"] });
      // Invalidate total balance
      queryClient.invalidateQueries({ queryKey: accountKeys.balance() });
    },
  });
}

// Update account
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<DecryptedAccount>;
    }) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update account");
      }

      return response.json();
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: accountKeys.list() });

      const previousAccounts = queryClient.getQueryData<DecryptedAccount[]>(
        accountKeys.list(),
      );

      queryClient.setQueryData<DecryptedAccount[]>(accountKeys.list(), (old) => {
        if (!old) return old;
        return old.map((account) =>
          account.id === id ? { ...account, ...updates } : account,
        );
      });

      return { previousAccounts };
    },
    onError: (err, variables, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(accountKeys.list(), context.previousAccounts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.list() });
      // Invalidate pools since account balance affects Free pool
      queryClient.invalidateQueries({ queryKey: ["pools"] });
      // Invalidate free balance to recalculate when exclude_from_free changes
      queryClient.invalidateQueries({ queryKey: ["pools", "freeBalance"] });
      // Invalidate total balance
      queryClient.invalidateQueries({ queryKey: accountKeys.balance() });
    },
  });
}

// Archive account
export function useArchiveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to archive account");
      }

      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: accountKeys.list() });

      const previousAccounts = queryClient.getQueryData<DecryptedAccount[]>(
        accountKeys.list(),
      );

      queryClient.setQueryData<DecryptedAccount[]>(accountKeys.list(), (old) => {
        if (!old) return old;
        return old.map((account) =>
          account.id === id ? { ...account, is_active: false } : account,
        );
      });

      return { previousAccounts };
    },
    onError: (err, id, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(accountKeys.list(), context.previousAccounts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.list() });
      // Invalidate pools since archiving account affects Free pool
      queryClient.invalidateQueries({ queryKey: ["pools"] });
      // Invalidate free balance
      queryClient.invalidateQueries({ queryKey: ["pools", "freeBalance"] });
      // Invalidate total balance
      queryClient.invalidateQueries({ queryKey: accountKeys.balance() });
    },
  });
}

// Restore account
export function useRestoreAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to restore account");
      }

      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: accountKeys.list() });

      const previousAccounts = queryClient.getQueryData<DecryptedAccount[]>(
        accountKeys.list(),
      );

      queryClient.setQueryData<DecryptedAccount[]>(accountKeys.list(), (old) => {
        if (!old) return old;
        return old.map((account) =>
          account.id === id ? { ...account, is_active: true } : account,
        );
      });

      return { previousAccounts };
    },
    onError: (err, id, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(accountKeys.list(), context.previousAccounts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.list() });
      // Invalidate pools since restoring account affects Free pool
      queryClient.invalidateQueries({ queryKey: ["pools"] });
      // Invalidate free balance
      queryClient.invalidateQueries({ queryKey: ["pools", "freeBalance"] });
      // Invalidate total balance
      queryClient.invalidateQueries({ queryKey: accountKeys.balance() });
    },
  });
}

// Permanently delete account
export function usePermanentDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/accounts/${id}?permanent=true`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to permanently delete account");
      }

      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: accountKeys.list() });

      const previousAccounts = queryClient.getQueryData<DecryptedAccount[]>(
        accountKeys.list(),
      );

      queryClient.setQueryData<DecryptedAccount[]>(accountKeys.list(), (old) => {
        if (!old) return old;
        return old.filter((account) => account.id !== id);
      });

      return { previousAccounts };
    },
    onError: (err, id, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(accountKeys.list(), context.previousAccounts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.list() });
      // Invalidate pools since deleting account affects Free pool
      queryClient.invalidateQueries({ queryKey: ["pools"] });
      // Invalidate free balance
      queryClient.invalidateQueries({ queryKey: ["pools", "freeBalance"] });
      // Invalidate total balance
      queryClient.invalidateQueries({ queryKey: accountKeys.balance() });
    },
  });
}
