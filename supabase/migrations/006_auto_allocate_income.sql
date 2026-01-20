-- Function to automatically allocate income to "Free" pool
CREATE OR REPLACE FUNCTION public.allocate_income_to_free_pool()
RETURNS TRIGGER AS $$
DECLARE
    free_pool_id UUID;
    existing_allocation_amount DECIMAL(15, 2);
BEGIN
    -- Only process income transactions
    IF NEW.type = 'income' THEN
        -- Get the user's "Free" pool
        SELECT id INTO free_pool_id
        FROM public.money_pools
        WHERE user_id = NEW.user_id AND type = 'free'
        LIMIT 1;
        
        IF free_pool_id IS NULL THEN
            RAISE EXCEPTION 'Free pool not found for user';
        END IF;
        
        -- Check if allocation already exists for this account and pool
        SELECT amount INTO existing_allocation_amount
        FROM public.allocations
        WHERE user_id = NEW.user_id 
          AND account_id = NEW.account_id 
          AND pool_id = free_pool_id;
        
        -- If allocation exists, update it; otherwise insert new one
        IF existing_allocation_amount IS NOT NULL THEN
            UPDATE public.allocations
            SET amount = amount + NEW.amount,
                updated_at = NOW()
            WHERE user_id = NEW.user_id 
              AND account_id = NEW.account_id 
              AND pool_id = free_pool_id;
        ELSE
            INSERT INTO public.allocations (user_id, account_id, pool_id, amount)
            VALUES (NEW.user_id, NEW.account_id, free_pool_id, NEW.amount);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically allocate income to free pool
CREATE TRIGGER allocate_income_to_free
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    WHEN (NEW.type = 'income')
    EXECUTE FUNCTION public.allocate_income_to_free_pool();

-- Function to adjust allocation when income transaction is deleted
CREATE OR REPLACE FUNCTION public.deallocate_income_from_free_pool()
RETURNS TRIGGER AS $$
DECLARE
    free_pool_id UUID;
    existing_allocation_amount DECIMAL(15, 2);
BEGIN
    -- Only process income transactions
    IF OLD.type = 'income' THEN
        -- Get the user's "Free" pool
        SELECT id INTO free_pool_id
        FROM public.money_pools
        WHERE user_id = OLD.user_id AND type = 'free'
        LIMIT 1;
        
        IF free_pool_id IS NOT NULL THEN
            -- Get current allocation
            SELECT amount INTO existing_allocation_amount
            FROM public.allocations
            WHERE user_id = OLD.user_id 
              AND account_id = OLD.account_id 
              AND pool_id = free_pool_id;
            
            IF existing_allocation_amount IS NOT NULL THEN
                -- Subtract the transaction amount
                IF existing_allocation_amount <= OLD.amount THEN
                    -- Delete allocation if it would be zero or negative
                    DELETE FROM public.allocations
                    WHERE user_id = OLD.user_id 
                      AND account_id = OLD.account_id 
                      AND pool_id = free_pool_id;
                ELSE
                    -- Update allocation
                    UPDATE public.allocations
                    SET amount = amount - OLD.amount,
                        updated_at = NOW()
                    WHERE user_id = OLD.user_id 
                      AND account_id = OLD.account_id 
                      AND pool_id = free_pool_id;
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to adjust allocation when income is deleted
CREATE TRIGGER deallocate_income_from_free
    BEFORE DELETE ON public.transactions
    FOR EACH ROW
    WHEN (OLD.type = 'income')
    EXECUTE FUNCTION public.deallocate_income_from_free_pool();
