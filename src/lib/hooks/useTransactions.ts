import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/lib/types/database";
import { accountKeys } from "./useAccounts";
import { poolKeys } from "./usePools";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

// Query keys
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters?: any) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

// Fetch transactions
export function useTransactions() {
  return useQuery({
    queryKey: transactionKeys.list(),
    queryFn: async (): Promise<Transaction[]> => {
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const data = await response.json();
      return data.transactions || [];
    },
  });
}

// Create transaction
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: "income" | "expense" | "transfer";
      amount: number;
      currency: string;
      account_id?: string;
      from_account_id?: string;
      to_account_id?: string;
      category?: string;
      description?: string;
    }) => {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      return response.json();
    },
    onMutate: async (newTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: transactionKeys.list() });

      // Snapshot previous value
      const previousTransactions = queryClient.getQueryData<Transaction[]>(
        transactionKeys.list(),
      );

      // Optimistically update transactions
      queryClient.setQueryData<Transaction[]>(transactionKeys.list(), (old) => {
        if (!old) return old;
        const optimisticTransaction: Transaction = {
          id: `temp-${Date.now()}`,
          user_id: "",
          type: newTransaction.type,
          amount: newTransaction.amount,
          currency: newTransaction.currency,
          account_id: newTransaction.account_id || null,
          from_account_id: newTransaction.from_account_id || null,
          to_account_id: newTransaction.to_account_id || null,
          category: newTransaction.category || null,
          description: newTransaction.description || null,
          encrypted_data: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          transaction_date: new Date().toISOString(),
        };
        return [optimisticTransaction, ...old];
      });

      // Optimistically update account balances
      if (newTransaction.type === "income" && newTransaction.account_id) {
        queryClient.setQueryData(accountKeys.list(), (old: any) => {
          if (!old) return old;
          return old.map((account: any) =>
            account.id === newTransaction.account_id
              ? {
                  ...account,
                  balance: account.balance + newTransaction.amount,
                }
              : account,
          );
        });
      } else if (
        newTransaction.type === "expense" &&
        newTransaction.account_id
      ) {
        queryClient.setQueryData(accountKeys.list(), (old: any) => {
          if (!old) return old;
          return old.map((account: any) =>
            account.id === newTransaction.account_id
              ? {
                  ...account,
                  balance: account.balance - newTransaction.amount,
                }
              : account,
          );
        });
      } else if (newTransaction.type === "transfer") {
        queryClient.setQueryData(accountKeys.list(), (old: any) => {
          if (!old) return old;
          return old.map((account: any) => {
            if (account.id === newTransaction.from_account_id) {
              return {
                ...account,
                balance: account.balance - newTransaction.amount,
              };
            }
            if (account.id === newTransaction.to_account_id) {
              return {
                ...account,
                balance: account.balance + newTransaction.amount,
              };
            }
            return account;
          });
        });
      }

      return { previousTransactions };
    },
    onError: (err, newTransaction, context) => {
      // Rollback on error
      if (context?.previousTransactions) {
        queryClient.setQueryData(
          transactionKeys.list(),
          context.previousTransactions,
        );
      }
      // Also rollback accounts
      queryClient.invalidateQueries({ queryKey: accountKeys.list() });
    },
    onSuccess: () => {
      // Invalidate all related queries to get fresh data
      queryClient.invalidateQueries({ queryKey: transactionKeys.list() });
      queryClient.invalidateQueries({ queryKey: accountKeys.list() });
      queryClient.invalidateQueries({ queryKey: poolKeys.list() });
    },
  });
}

// Delete transaction
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.list() });

      const previousTransactions = queryClient.getQueryData<Transaction[]>(
        transactionKeys.list(),
      );

      queryClient.setQueryData<Transaction[]>(transactionKeys.list(), (old) => {
        if (!old) return old;
        return old.filter((transaction) => transaction.id !== id);
      });

      return { previousTransactions };
    },
    onError: (err, id, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(
          transactionKeys.list(),
          context.previousTransactions,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.list() });
      queryClient.invalidateQueries({ queryKey: accountKeys.list() });
      queryClient.invalidateQueries({ queryKey: poolKeys.list() });
    },
  });
}
