-- Migration: Add end-to-end encryption support
-- This migration adds encrypted_data fields to store sensitive financial information
-- and makes original fields nullable for backward compatibility during transition

-- Add encrypted_data column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS encrypted_data JSONB;

-- Make sensitive fields nullable (for migration period)
ALTER TABLE public.accounts 
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN balance DROP NOT NULL;

-- Add comment explaining the encryption
COMMENT ON COLUMN public.accounts.encrypted_data IS 'Encrypted sensitive data: {name, balance}. Client-side encrypted with user key.';

-- Add encrypted_data column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS encrypted_data JSONB;

-- Make sensitive fields nullable (for migration period)
ALTER TABLE public.transactions 
ALTER COLUMN amount DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.transactions.encrypted_data IS 'Encrypted sensitive data: {amount, category, description}. Client-side encrypted with user key.';

-- Add encrypted_data column to money_pools table
ALTER TABLE public.money_pools 
ADD COLUMN IF NOT EXISTS encrypted_data JSONB;

-- Make sensitive fields nullable (for migration period)
ALTER TABLE public.money_pools 
ALTER COLUMN name DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.money_pools.encrypted_data IS 'Encrypted sensitive data: {name}. Client-side encrypted with user key.';

-- Add encrypted_data column to allocations table
ALTER TABLE public.allocations 
ADD COLUMN IF NOT EXISTS encrypted_data JSONB;

-- Make sensitive fields nullable
ALTER TABLE public.allocations 
ALTER COLUMN amount DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.allocations.encrypted_data IS 'Encrypted sensitive data: {amount}. Client-side encrypted with user key.';

-- Create indexes on encrypted_data for existence checks
CREATE INDEX IF NOT EXISTS idx_accounts_encrypted ON public.accounts(user_id) WHERE encrypted_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_encrypted ON public.transactions(user_id) WHERE encrypted_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pools_encrypted ON public.money_pools(user_id) WHERE encrypted_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_allocations_encrypted ON public.allocations(user_id) WHERE encrypted_data IS NOT NULL;

-- Note: The server will never decrypt these fields
-- All encryption/decryption happens client-side
-- Server only stores and retrieves opaque encrypted blobs
