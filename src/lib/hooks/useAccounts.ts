import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/lib/types/database";
import { CurrencyCode } from "@/lib/constants/currencies";

type Account = Database["public"]["Tables"]["accounts"]["Row"] & {
  convertedBalance?: number;
  defaultCurrency?: string;
};
type AccountType = Database["public"]["Tables"]["accounts"]["Row"]["type"];

// Query keys
export const accountKeys = {
  all: ["accounts"] as const,
  lists: () => [...accountKeys.all, "list"] as const,
  list: (filters?: any) => [...accountKeys.lists(), filters] as const,
  details: () => [...accountKeys.all, "detail"] as const,
  detail: (id: string) => [...accountKeys.details(), id] as const,
};

// Fetch accounts
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: async (): Promise<Account[]> => {
      const response = await fetch("/api/accounts");
      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }
      const data = await response.json();
      return data.accounts || [];
    },
  });
}

// Create account
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: {
      name: string;
      type: AccountType;
      currency: CurrencyCode;
      balance: number;
    }) => {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create account");
      }

      return response.json();
    },
    onMutate: async (newAccount) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: accountKeys.list() });

      // Snapshot previous value
      const previousAccounts = queryClient.getQueryData<Account[]>(
        accountKeys.list(),
      );

      // Optimistically update
      queryClient.setQueryData<Account[]>(accountKeys.list(), (old) => {
        if (!old) return old;
        const optimisticAccount: Account = {
          id: `temp-${Date.now()}`,
          user_id: "",
          name: newAccount.name,
          type: newAccount.type,
          currency: newAccount.currency,
          balance: newAccount.balance,
          is_active: true,
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
      updates: Partial<Account>;
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

      const previousAccounts = queryClient.getQueryData<Account[]>(
        accountKeys.list(),
      );

      queryClient.setQueryData<Account[]>(accountKeys.list(), (old) => {
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

      const previousAccounts = queryClient.getQueryData<Account[]>(
        accountKeys.list(),
      );

      queryClient.setQueryData<Account[]>(accountKeys.list(), (old) => {
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

      const previousAccounts = queryClient.getQueryData<Account[]>(
        accountKeys.list(),
      );

      queryClient.setQueryData<Account[]>(accountKeys.list(), (old) => {
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

      const previousAccounts = queryClient.getQueryData<Account[]>(
        accountKeys.list(),
      );

      queryClient.setQueryData<Account[]>(accountKeys.list(), (old) => {
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
    },
  });
}
