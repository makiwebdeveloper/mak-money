export type PoolType = "free" | "mandatory" | "savings" | "custom";
export type AccountType = "bank" | "crypto" | "other";
export type TransactionType = "income" | "expense" | "transfer";

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
          name: string;
          type: PoolType;
          color: string;
          icon: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: PoolType;
          color?: string;
          icon?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: PoolType;
          color?: string;
          icon?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: AccountType;
          currency: string;
          balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: AccountType;
          currency?: string;
          balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: AccountType;
          currency?: string;
          balance?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          currency: string;
          account_id?: string | null;
          from_account_id?: string | null;
          to_account_id?: string | null;
          category?: string | null;
          description?: string | null;
          transaction_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: number;
          currency?: string;
          account_id?: string | null;
          from_account_id?: string | null;
          to_account_id?: string | null;
          category?: string | null;
          description?: string | null;
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
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          pool_id: string;
          amount: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          pool_id?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
