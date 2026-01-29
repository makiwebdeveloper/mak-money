-- Remove old functions and triggers that reference deleted columns
-- These were created before implementing zero-knowledge encryption

-- Drop old validation trigger and function that referenced deleted 'amount' column
DROP TRIGGER IF EXISTS validate_allocation_before_insert_update ON public.allocations;
DROP TRIGGER IF EXISTS validate_allocation_amount ON public.allocations;
DROP FUNCTION IF EXISTS public.validate_allocation_amount();

-- Drop old balance calculation functions that referenced deleted columns
DROP FUNCTION IF EXISTS public.get_pool_balance(UUID);
DROP FUNCTION IF EXISTS public.get_account_unallocated_balance(UUID);

-- Drop old account balance update triggers that referenced deleted 'balance' column
DROP TRIGGER IF EXISTS update_account_balance_on_transaction_insert ON public.transactions;
DROP TRIGGER IF EXISTS update_account_balance_on_transaction_delete ON public.transactions;
DROP FUNCTION IF EXISTS public.update_account_balance();
DROP FUNCTION IF EXISTS public.revert_account_balance();

-- Note: All balance calculations are now done client-side with encrypted data
-- Server only stores encrypted blobs and cannot perform financial calculations