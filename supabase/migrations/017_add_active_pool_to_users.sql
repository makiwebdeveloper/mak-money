ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS active_pool_id UUID REFERENCES public.money_pools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_pool_id
ON public.users(active_pool_id);
