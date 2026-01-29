-- Disable transaction triggers that depend on unencrypted amount field
-- Since we're using end-to-end encryption, the server can't read the amount field
-- Account balance updates will be handled on the client side instead

-- Drop the triggers
DROP TRIGGER IF EXISTS on_transaction_created ON public.transactions;
DROP TRIGGER IF EXISTS on_transaction_deleted ON public.transactions;

-- Drop the functions
DROP FUNCTION IF EXISTS public.update_account_balance_on_transaction();
DROP FUNCTION IF EXISTS public.revert_account_balance_on_transaction_delete();

-- Note: Account balance updates are now handled client-side through the API
-- The client will:
-- 1. Create/delete the transaction record
-- 2. Update the affected account(s) balance(s) in the accounts table
-- 3. Ensure both operations succeed or fail together
