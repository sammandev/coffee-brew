-- Returns the number of users who wishlisted each brew in the given set.
-- SECURITY DEFINER because the brew_wishlist table has RLS restricting select to own rows.
create or replace function public.get_brew_wishlist_counts(brew_ids uuid[])
returns table(brew_id uuid, wishlist_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select bw.brew_id, count(*) as wishlist_count
  from public.brew_wishlist bw
  where bw.brew_id = any(brew_ids)
  group by bw.brew_id;
$$;
