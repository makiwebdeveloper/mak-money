-- Create enum for account types
CREATE TYPE account_type AS ENUM ('bank', 'crypto', 'other');

-- Create accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type account_type NOT NULL DEFAULT 'other',
    currency TEXT NOT NULL DEFAULT 'USD',
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_accounts_user_active ON public.accounts(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own accounts
CREATE POLICY "Users can view own accounts"
    ON public.accounts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy: Users can insert their own accounts
CREATE POLICY "Users can insert own accounts"
    ON public.accounts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own accounts
CREATE POLICY "Users can update own accounts"
    ON public.accounts
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy: Users can delete their own accounts
CREATE POLICY "Users can delete own accounts"
    ON public.accounts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Update updated_at timestamp automatically
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
