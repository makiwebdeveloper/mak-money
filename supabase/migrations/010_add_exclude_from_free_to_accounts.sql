-- Add exclude_from_free column to accounts table
-- This allows users to mark accounts (like savings) that should not be included in free balance calculation

ALTER TABLE public.accounts 
ADD COLUMN exclude_from_free BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.accounts.exclude_from_free IS 'If true, this account balance will not be included in free money calculations';
