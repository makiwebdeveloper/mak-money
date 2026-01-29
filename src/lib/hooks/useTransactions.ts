import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, DecryptedTransaction } from "@/lib/types/database";
import { accountKeys, useAccounts } from "./useAccounts";
import { poolKeys } from "./usePools";
import {
  useTransactionEncryption,
  useAccountEncryption,
} from "./useEncryption";

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
  const { decryptTransactionRow } = useTransactionEncryption();

  return useQuery({
    queryKey: transactionKeys.list(),
    queryFn: async (): Promise<DecryptedTransaction[]> => {
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const data = await response.json();

      // Decrypt all transactions on client side
      const decrypted = await Promise.all(
        (data.transactions || []).map(async (transaction: any) => {
          try {
            return await decryptTransactionRow(transaction);
          } catch (error) {
            console.error(
              "Failed to decrypt transaction:",
              transaction.id,
              error,
            );
            return null;
          }
        }),
      );

      return decrypted.filter((tx): tx is DecryptedTransaction => tx !== null);
    },
  });
}

// Create transaction
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { encryptTransaction } = useTransactionEncryption();
  const { encryptAccount } = useAccountEncryption();

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
      // Encrypt sensitive data
      const encrypted_data = await encryptTransaction(
        data.amount,
        data.category,
        data.description,
      );

      // Create transaction
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: data.type,
          currency: data.currency,
          account_id: data.account_id,
          from_account_id: data.from_account_id,
          to_account_id: data.to_account_id,
          encrypted_data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      const result = await response.json();

      // Now update account balances in the database
      const currentAccounts = queryClient.getQueryData<any[]>(
        accountKeys.list(),
      );

      if (data.type === "income" && data.account_id) {
        const account = currentAccounts?.find(
          (acc) => acc.id === data.account_id,
        );
        if (account) {
          const newBalance = account.balance + data.amount;
          const encryptedAccountData = await encryptAccount(
            account.name,
            newBalance,
          );
          await fetch(`/api/accounts/${data.account_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encrypted_data: encryptedAccountData }),
          });
        }
      } else if (data.type === "expense" && data.account_id) {
        const account = currentAccounts?.find(
          (acc) => acc.id === data.account_id,
        );
        if (account) {
          const newBalance = account.balance - data.amount;
          const encryptedAccountData = await encryptAccount(
            account.name,
            newBalance,
          );
          await fetch(`/api/accounts/${data.account_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encrypted_data: encryptedAccountData }),
          });
        }
      } else if (data.type === "transfer") {
        // Update both accounts
        if (data.from_account_id) {
          const fromAccount = currentAccounts?.find(
            (acc) => acc.id === data.from_account_id,
          );
          if (fromAccount) {
            const newBalance = fromAccount.balance - data.amount;
            const encryptedAccountData = await encryptAccount(
              fromAccount.name,
              newBalance,
            );
            await fetch(`/api/accounts/${data.from_account_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ encrypted_data: encryptedAccountData }),
            });
          }
        }
        if (data.to_account_id) {
          const toAccount = currentAccounts?.find(
            (acc) => acc.id === data.to_account_id,
          );
          if (toAccount) {
            const newBalance = toAccount.balance + data.amount;
            const encryptedAccountData = await encryptAccount(
              toAccount.name,
              newBalance,
            );
            await fetch(`/api/accounts/${data.to_account_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ encrypted_data: encryptedAccountData }),
            });
          }
        }
      }

      return result;
    },
    onMutate: async (newTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: transactionKeys.list() });

      // Snapshot previous value
      const previousTransactions = queryClient.getQueryData<
        DecryptedTransaction[]
      >(transactionKeys.list());

      // Optimistically update transactions list only (not account balances)
      // Account balances will be updated in mutationFn and refreshed via invalidateQueries
      queryClient.setQueryData<DecryptedTransaction[]>(
        transactionKeys.list(),
        (old) => {
          if (!old) return old;
          const optimisticTransaction: DecryptedTransaction = {
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            transaction_date: new Date().toISOString(),
          };
          return [optimisticTransaction, ...old];
        },
      );

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
      // Invalidate accounts to refresh balances from server
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
  const { encryptAccount } = useAccountEncryption();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get transaction data before deleting to restore balances
      const transactions = queryClient.getQueryData<DecryptedTransaction[]>(
        transactionKeys.list(),
      );
      const transaction = transactions?.find((t) => t.id === id);

      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      // Restore account balances
      if (transaction) {
        const currentAccounts = queryClient.getQueryData<any[]>(
          accountKeys.list(),
        );

        if (transaction.type === "income" && transaction.account_id) {
          const account = currentAccounts?.find(
            (acc) => acc.id === transaction.account_id,
          );
          if (account) {
            const newBalance = account.balance - transaction.amount;
            const encryptedAccountData = await encryptAccount(
              account.name,
              newBalance,
            );
            await fetch(`/api/accounts/${transaction.account_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ encrypted_data: encryptedAccountData }),
            });
          }
        } else if (transaction.type === "expense" && transaction.account_id) {
          const account = currentAccounts?.find(
            (acc) => acc.id === transaction.account_id,
          );
          if (account) {
            const newBalance = account.balance + transaction.amount;
            const encryptedAccountData = await encryptAccount(
              account.name,
              newBalance,
            );
            await fetch(`/api/accounts/${transaction.account_id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ encrypted_data: encryptedAccountData }),
            });
          }
        } else if (transaction.type === "transfer") {
          // Restore both accounts
          if (transaction.from_account_id) {
            const fromAccount = currentAccounts?.find(
              (acc) => acc.id === transaction.from_account_id,
            );
            if (fromAccount) {
              const newBalance = fromAccount.balance + transaction.amount;
              const encryptedAccountData = await encryptAccount(
                fromAccount.name,
                newBalance,
              );
              await fetch(`/api/accounts/${transaction.from_account_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ encrypted_data: encryptedAccountData }),
              });
            }
          }
          if (transaction.to_account_id) {
            const toAccount = currentAccounts?.find(
              (acc) => acc.id === transaction.to_account_id,
            );
            if (toAccount) {
              const newBalance = toAccount.balance - transaction.amount;
              const encryptedAccountData = await encryptAccount(
                toAccount.name,
                newBalance,
              );
              await fetch(`/api/accounts/${transaction.to_account_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ encrypted_data: encryptedAccountData }),
              });
            }
          }
        }
      }

      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: transactionKeys.list() });

      const previousTransactions = queryClient.getQueryData<
        DecryptedTransaction[]
      >(transactionKeys.list());

      queryClient.setQueryData<DecryptedTransaction[]>(
        transactionKeys.list(),
        (old) => {
          if (!old) return old;
          return old.filter((transaction) => transaction.id !== id);
        },
      );

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
