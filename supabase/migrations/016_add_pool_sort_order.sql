ALTER TABLE public.money_pools
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

WITH ordered_pools AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN type = 'free' THEN 0 ELSE 1 END,
        created_at,
        id
    ) - 1 AS next_sort_order
  FROM public.money_pools
)
UPDATE public.money_pools
SET sort_order = ordered_pools.next_sort_order
FROM ordered_pools
WHERE public.money_pools.id = ordered_pools.id;

CREATE INDEX IF NOT EXISTS idx_money_pools_user_sort_order
ON public.money_pools(user_id, sort_order);
