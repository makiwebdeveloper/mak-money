-- Migration: Remove legacy unencrypted fields
-- Now that all data is encrypted in encrypted_data JSONB column,
-- we can safely remove the old plaintext fields

-- Drop old columns from accounts table
ALTER TABLE public.accounts 
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS balance;

-- Drop old columns from transactions table
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS amount,
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS description;

-- Drop old columns from money_pools table
ALTER TABLE public.money_pools 
DROP COLUMN IF EXISTS name;

-- Drop old columns from allocations table
ALTER TABLE public.allocations 
DROP COLUMN IF EXISTS amount;

-- Make encrypted_data NOT NULL for user-created data
-- But use a default empty JSONB for system-created records (like Free pool)
ALTER TABLE public.accounts 
ALTER COLUMN encrypted_data SET DEFAULT '{}'::jsonb,
ALTER COLUMN encrypted_data SET NOT NULL;

ALTER TABLE public.transactions 
ALTER COLUMN encrypted_data SET DEFAULT '{}'::jsonb,
ALTER COLUMN encrypted_data SET NOT NULL;

ALTER TABLE public.money_pools 
ALTER COLUMN encrypted_data SET DEFAULT '{}'::jsonb,
ALTER COLUMN encrypted_data SET NOT NULL;

ALTER TABLE public.allocations 
ALTER COLUMN encrypted_data SET DEFAULT '{}'::jsonb,
ALTER COLUMN encrypted_data SET NOT NULL;

-- Update comments
COMMENT ON TABLE public.accounts IS 'User accounts with client-side encrypted sensitive data';
COMMENT ON TABLE public.transactions IS 'Financial transactions with client-side encrypted amounts';
COMMENT ON TABLE public.money_pools IS 'Money pools (budgets/envelopes) with client-side encrypted names';
COMMENT ON TABLE public.allocations IS 'Pool allocations with client-side encrypted amounts';

-- Note: The server can only store and retrieve encrypted blobs
-- All encryption/decryption happens client-side with user's private key
-- Server has zero-knowledge of actual financial data

-- Update the create_default_free_pool function to work with encrypted_data
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
