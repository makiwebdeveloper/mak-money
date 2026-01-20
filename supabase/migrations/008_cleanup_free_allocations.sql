-- Clean up existing allocations in Free pool
-- Since Free balance is now calculated dynamically, we don't need allocations for it

DELETE FROM public.allocations
WHERE pool_id IN (
    SELECT id FROM public.money_pools WHERE type = 'free'
);

-- Now free pool balance will be calculated as:
-- Total Account Balance - Sum of all other allocations
