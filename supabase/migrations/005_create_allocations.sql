-- Create allocations table
-- Allocations connect accounts to pools, showing how money from accounts is distributed across pools
CREATE TABLE IF NOT EXISTS public.allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    pool_id UUID NOT NULL REFERENCES public.money_pools(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One unique allocation per account-pool pair per user
    CONSTRAINT unique_account_pool_allocation UNIQUE (user_id, account_id, pool_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_allocations_user_id ON public.allocations(user_id);
CREATE INDEX idx_allocations_account_id ON public.allocations(account_id);
CREATE INDEX idx_allocations_pool_id ON public.allocations(pool_id);
CREATE INDEX idx_allocations_user_account ON public.allocations(user_id, account_id);
CREATE INDEX idx_allocations_user_pool ON public.allocations(user_id, pool_id);

-- Enable Row Level Security
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own allocations
CREATE POLICY "Users can view own allocations"
    ON public.allocations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy: Users can insert their own allocations
CREATE POLICY "Users can insert own allocations"
    ON public.allocations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own allocations
CREATE POLICY "Users can update own allocations"
    ON public.allocations
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy: Users can delete their own allocations
CREATE POLICY "Users can delete own allocations"
    ON public.allocations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to validate allocations don't exceed account balance
CREATE OR REPLACE FUNCTION public.validate_allocation_amount()
RETURNS TRIGGER AS $$
DECLARE
    account_balance DECIMAL(15, 2);
    total_allocated DECIMAL(15, 2);
BEGIN
    -- Get account balance
    SELECT balance INTO account_balance
    FROM public.accounts
    WHERE id = NEW.account_id;
    
    -- Calculate total allocated for this account (excluding current allocation if updating)
    SELECT COALESCE(SUM(amount), 0) INTO total_allocated
    FROM public.allocations
    WHERE account_id = NEW.account_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    -- Check if new allocation would exceed account balance
    IF (total_allocated + NEW.amount) > account_balance THEN
        RAISE EXCEPTION 'Total allocations (%) exceed account balance (%)', 
            (total_allocated + NEW.amount), account_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate allocation amounts
CREATE TRIGGER validate_allocation_before_insert_update
    BEFORE INSERT OR UPDATE ON public.allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_allocation_amount();

-- Function to get pool balance (sum of all allocations to this pool)
CREATE OR REPLACE FUNCTION public.get_pool_balance(p_pool_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    pool_balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO pool_balance
    FROM public.allocations
    WHERE pool_id = p_pool_id;
    
    RETURN pool_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get unallocated balance for an account
CREATE OR REPLACE FUNCTION public.get_account_unallocated_balance(p_account_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    account_balance DECIMAL(15, 2);
    total_allocated DECIMAL(15, 2);
BEGIN
    -- Get account balance
    SELECT balance INTO account_balance
    FROM public.accounts
    WHERE id = p_account_id;
    
    -- Get total allocated
    SELECT COALESCE(SUM(amount), 0) INTO total_allocated
    FROM public.allocations
    WHERE account_id = p_account_id;
    
    RETURN (account_balance - total_allocated);
END;
$$ LANGUAGE plpgsql;

-- Update updated_at timestamp automatically
CREATE TRIGGER update_allocations_updated_at
    BEFORE UPDATE ON public.allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
