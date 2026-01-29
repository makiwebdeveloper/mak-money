-- Migration: Fix encrypted_data defaults for system-created records
-- This fixes the issue where automatic triggers fail because encrypted_data has no default

-- Add default empty JSONB for all encrypted_data columns
ALTER TABLE public.accounts 
ALTER COLUMN encrypted_data SET DEFAULT '{}'::jsonb;

ALTER TABLE public.transactions 
ALTER COLUMN encrypted_data SET DEFAULT '{}'::jsonb;

ALTER TABLE public.money_pools 
ALTER COLUMN encrypted_data SET DEFAULT '{}'::jsonb;

ALTER TABLE public.allocations 
ALTER COLUMN encrypted_data SET DEFAULT '{}'::jsonb;

-- Update the create_default_free_pool function to use encrypted_data
CREATE OR REPLACE FUNCTION public.create_default_free_pool()
RETURNS TRIGGER AS $$
BEGIN
    -- Create Free pool with empty encrypted_data
    -- Client will encrypt and update it on first login
    INSERT INTO public.money_pools (user_id, type, color, icon, encrypted_data)
    VALUES (
        NEW.id,
        'free',
        '#10b981',
        'coins',
        '{}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
