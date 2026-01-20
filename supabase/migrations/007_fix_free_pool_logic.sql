-- Drop the old auto-allocation triggers since we don't need them anymore
-- Free money is calculated dynamically as: Total Balance - Sum of Allocations

DROP TRIGGER IF EXISTS allocate_income_to_free ON public.transactions;
DROP TRIGGER IF EXISTS deallocate_income_from_free ON public.transactions;
DROP FUNCTION IF EXISTS public.allocate_income_to_free_pool();
DROP FUNCTION IF EXISTS public.deallocate_income_from_free_pool();

-- Update get_pool_balance function to handle free pool specially
CREATE OR REPLACE FUNCTION public.get_pool_balance(p_pool_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    pool_balance DECIMAL(15, 2);
    pool_type TEXT;
    total_account_balance DECIMAL(15, 2);
    total_allocated DECIMAL(15, 2);
BEGIN
    -- Check if this is the free pool
    SELECT type INTO pool_type
    FROM public.money_pools
    WHERE id = p_pool_id;
    
    IF pool_type = 'free' THEN
        -- For free pool: return total account balance minus all allocations
        -- Get user_id from the pool
        DECLARE
            p_user_id UUID;
        BEGIN
            SELECT user_id INTO p_user_id
            FROM public.money_pools
            WHERE id = p_pool_id;
            
            -- Get total balance from all user's accounts
            SELECT COALESCE(SUM(balance), 0) INTO total_account_balance
            FROM public.accounts
            WHERE user_id = p_user_id;
            
            -- Get total allocated (excluding free pool itself)
            SELECT COALESCE(SUM(amount), 0) INTO total_allocated
            FROM public.allocations
            WHERE user_id = p_user_id
            AND pool_id != p_pool_id;
            
            RETURN (total_account_balance - total_allocated);
        END;
    ELSE
        -- For regular pools: sum allocations
        SELECT COALESCE(SUM(amount), 0) INTO pool_balance
        FROM public.allocations
        WHERE pool_id = p_pool_id;
        
        RETURN pool_balance;
    END IF;
END;
$$ LANGUAGE plpgsql;
