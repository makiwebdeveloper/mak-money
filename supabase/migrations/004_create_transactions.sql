-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL,
    
    -- For income/expense: single account
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    
    -- For transfers: from -> to
    from_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    
    -- Optional metadata
    category TEXT,
    description TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_income_expense CHECK (
        (type IN ('income', 'expense') AND account_id IS NOT NULL AND from_account_id IS NULL AND to_account_id IS NULL)
        OR
        (type = 'transfer' AND account_id IS NULL AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL AND from_account_id != to_account_id)
    )
);

-- Create indexes for faster queries
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_from_account ON public.transactions(from_account_id);
CREATE INDEX idx_transactions_to_account ON public.transactions(to_account_id);
CREATE INDEX idx_transactions_type ON public.transactions(user_id, type);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
    ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy: Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
    ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own transactions
CREATE POLICY "Users can update own transactions"
    ON public.transactions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy: Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
    ON public.transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update account balance on transaction
CREATE OR REPLACE FUNCTION public.update_account_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle income
    IF NEW.type = 'income' THEN
        UPDATE public.accounts
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    
    -- Handle expense
    ELSIF NEW.type = 'expense' THEN
        UPDATE public.accounts
        SET balance = balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    
    -- Handle transfer
    ELSIF NEW.type = 'transfer' THEN
        -- Deduct from source account
        UPDATE public.accounts
        SET balance = balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.from_account_id;
        
        -- Add to destination account
        UPDATE public.accounts
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.to_account_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update account balance on transaction insert
CREATE TRIGGER on_transaction_created
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_account_balance_on_transaction();

-- Function to revert account balance on transaction delete
CREATE OR REPLACE FUNCTION public.revert_account_balance_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Revert income (subtract from account)
    IF OLD.type = 'income' THEN
        UPDATE public.accounts
        SET balance = balance - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.account_id;
    
    -- Revert expense (add back to account)
    ELSIF OLD.type = 'expense' THEN
        UPDATE public.accounts
        SET balance = balance + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.account_id;
    
    -- Revert transfer
    ELSIF OLD.type = 'transfer' THEN
        -- Add back to source account
        UPDATE public.accounts
        SET balance = balance + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.from_account_id;
        
        -- Subtract from destination account
        UPDATE public.accounts
        SET balance = balance - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.to_account_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to revert account balance on transaction delete
CREATE TRIGGER on_transaction_deleted
    BEFORE DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.revert_account_balance_on_transaction_delete();

-- Update updated_at timestamp automatically
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
