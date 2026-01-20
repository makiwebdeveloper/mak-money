-- Emergency fix: Drop all old allocation triggers
DROP TRIGGER IF EXISTS allocate_income_to_free ON public.transactions;
DROP TRIGGER IF EXISTS deallocate_income_from_free ON public.transactions;
DROP FUNCTION IF EXISTS public.allocate_income_to_free_pool();
DROP FUNCTION IF EXISTS public.deallocate_income_from_free_pool();
