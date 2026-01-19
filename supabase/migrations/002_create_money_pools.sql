-- Create enum for pool types
CREATE TYPE pool_type AS ENUM ('free', 'mandatory', 'savings', 'custom');

-- Create money_pools table
CREATE TABLE IF NOT EXISTS public.money_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type pool_type NOT NULL DEFAULT 'custom',
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'wallet',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by user
CREATE INDEX idx_money_pools_user_id ON public.money_pools(user_id);
CREATE INDEX idx_money_pools_user_active ON public.money_pools(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.money_pools ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own pools
CREATE POLICY "Users can view own pools"
    ON public.money_pools
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy: Users can insert their own pools
CREATE POLICY "Users can insert own pools"
    ON public.money_pools
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own pools
CREATE POLICY "Users can update own pools"
    ON public.money_pools
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy: Users can delete their own pools (except 'free' type)
CREATE POLICY "Users can delete own pools"
    ON public.money_pools
    FOR DELETE
    USING (auth.uid() = user_id AND type != 'free');

-- Function to create default "Free" pool for new users
CREATE OR REPLACE FUNCTION public.create_default_free_pool()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.money_pools (user_id, name, type, color, icon)
    VALUES (
        NEW.id,
        'Свободные',
        'free',
        '#10b981',
        'coins'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create "Free" pool when user is created
CREATE OR REPLACE TRIGGER on_user_create_free_pool
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_free_pool();

-- Function to prevent deletion of 'free' type pools via UPDATE
CREATE OR REPLACE FUNCTION public.prevent_free_pool_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.type = 'free' AND NEW.is_active = false THEN
        RAISE EXCEPTION 'Cannot archive the Free pool';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent archiving free pool
CREATE OR REPLACE TRIGGER prevent_free_pool_archive
    BEFORE UPDATE ON public.money_pools
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_free_pool_deletion();

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_money_pools_updated_at
    BEFORE UPDATE ON public.money_pools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
