export type PoolType = "free" | "mandatory" | "savings" | "custom";
export type AccountType = "bank" | "crypto" | "other";
export type TransactionType = "income" | "expense" | "transfer";

// Encrypted data structures
import type { EncryptedData } from '../services/encryption-service';

export interface EncryptedAccountData {
  name: string;
  balance: number;
}

export interface EncryptedTransactionData {
  amount: number;
  category?: string | null;
  description?: string | null;
}

export interface EncryptedPoolData {
  name: string;
}

export interface EncryptedAllocationData {
  amount: number;
}

// Decrypted types for client-side use
export interface DecryptedAccount {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  is_active: boolean;
  exclude_from_free: boolean;
  created_at: string;
  updated_at: string;
}

export interface DecryptedTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  account_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  category: string | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface DecryptedPool {
  id: string;
  user_id: string;
  name: string;
  type: PoolType;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DecryptedAllocation {
  id: string;
  user_id: string;
  account_id: string;
  pool_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          default_currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          default_currency?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          default_currency?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      money_pools: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          type: PoolType;
          color: string;
          icon: string;
          is_active: boolean;
          encrypted_data: EncryptedData | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          type?: PoolType;
          color?: string;
          icon?: string;
          is_active?: boolean;
          encrypted_data?: EncryptedData | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          type?: PoolType;
          color?: string;
          icon?: string;
          is_active?: boolean;
          encrypted_data?: EncryptedData | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          type: AccountType;
          currency: string;
          balance: number | null;
          is_active: boolean;
          exclude_from_free: boolean;
          encrypted_data: EncryptedData | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          type?: AccountType;
          currency?: string;
          balance?: number | null;
          is_active?: boolean;
          exclude_from_free?: boolean;
          encrypted_data?: EncryptedData | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          type?: AccountType;
          currency?: string;
          balance?: number | null;
          is_active?: boolean;
          exclude_from_free?: boolean;
          encrypted_data?: EncryptedData | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: number | null;
          currency: string;
          account_id: string | null;
          from_account_id: string | null;
          to_account_id: string | null;
          category: string | null;
          description: string | null;
          encrypted_data: EncryptedData | null;
          transaction_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: TransactionType;
          amount?: number | null;
          currency: string;
          account_id?: string | null;
          from_account_id?: string | null;
          to_account_id?: string | null;
          category?: string | null;
          description?: string | null;
          encrypted_data?: EncryptedData | null;
          transaction_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: number | null;
          currency?: string;
          account_id?: string | null;
          from_account_id?: string | null;
          to_account_id?: string | null;
          category?: string | null;
          description?: string | null;
          encrypted_data?: EncryptedData | null;
          transaction_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      allocations: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          pool_id: string;
          amount: number | null;
          encrypted_data: EncryptedData | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          pool_id: string;
          amount?: number | null;
          encrypted_data?: EncryptedData | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          pool_id?: string;
          amount?: number | null;
          encrypted_data?: EncryptedData | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
