-- L-3: Add unique constraint on forum_threads.slug to back the slug uniqueness
-- guarantee at the DB level. The application-level TOCTOU check (SELECT count →
-- append suffix) is insufficient for concurrent inserts; the constraint ensures
-- duplicates are always caught and the retry loop in the API can handle them.

-- First, de-duplicate any existing slugs by appending the row's rowid suffix
-- to all but the earliest occurrence of each slug value.
do $$
declare
  rec record;
  counter integer;
begin
  for rec in
    select slug, array_agg(id order by created_at, id) as ids
    from public.forum_threads
    where slug is not null
    group by slug
    having count(*) > 1
  loop
    counter := 2;
    for i in 2..array_length(rec.ids, 1) loop
      update public.forum_threads
        set slug = rec.slug || '-' || counter
      where id = rec.ids[i];
      counter := counter + 1;
    end loop;
  end loop;
end;
$$;

-- Now add the unique constraint.
alter table public.forum_threads
  add constraint forum_threads_slug_unique unique (slug);
