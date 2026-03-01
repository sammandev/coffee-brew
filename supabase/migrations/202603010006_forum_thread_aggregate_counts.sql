-- Aggregate forum counters through SQL to avoid loading full reaction/comment row sets in page loaders.
create or replace function public.get_forum_thread_reaction_totals(thread_ids uuid[])
returns table(thread_id uuid, reaction_total bigint)
language sql
stable
as $$
  select fr.target_id::uuid as thread_id, count(*) as reaction_total
  from public.forum_reactions fr
  where fr.target_type = 'thread'
    and fr.target_id = any(thread_ids)
  group by fr.target_id;
$$;

create or replace function public.get_forum_thread_comment_totals(thread_ids uuid[])
returns table(thread_id uuid, comment_total bigint)
language sql
stable
as $$
  select fc.thread_id, count(*) as comment_total
  from public.forum_comments fc
  where fc.status = 'visible'
    and fc.thread_id = any(thread_ids)
  group by fc.thread_id;
$$;

create or replace function public.get_forum_subforum_thread_totals(subforum_ids uuid[])
returns table(subforum_id uuid, thread_total bigint)
language sql
stable
as $$
  select ft.subforum_id, count(*) as thread_total
  from public.forum_threads ft
  where ft.status = 'visible'
    and ft.deleted_at is null
    and ft.subforum_id = any(subforum_ids)
  group by ft.subforum_id;
$$;
