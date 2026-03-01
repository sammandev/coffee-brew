-- Efficient distinct roastery count for landing stats
create or replace function count_distinct_roasteries()
returns bigint
language sql
stable
as $$
  select count(distinct brand_roastery)
  from brews
  where status = 'published'
    and brand_roastery is not null
    and trim(brand_roastery) <> '';
$$;
