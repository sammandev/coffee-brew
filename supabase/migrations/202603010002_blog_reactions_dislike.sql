-- Blog reactions + dislike support + forum one-active reaction model.

alter type public.reaction_type add value if not exists 'dislike';

with ranked as (
	select
		id,
		row_number() over (partition by user_id, target_type, target_id order by created_at desc, id desc) as row_num
	from public.forum_reactions
)
delete from public.forum_reactions fr
using ranked r
where fr.id = r.id
	and r.row_num > 1;

do $$
declare
	constraint_name text;
	index_name text;
begin
	for constraint_name in
		select c.conname
		from pg_constraint c
		where c.conrelid = 'public.forum_reactions'::regclass
			and c.contype = 'u'
			and pg_get_constraintdef(c.oid) ilike '%(user_id, target_type, target_id, reaction)%'
	loop
		execute format('alter table public.forum_reactions drop constraint if exists %I', constraint_name);
	end loop;

	for index_name in
		select i.indexname
		from pg_indexes i
		where i.schemaname = 'public'
			and i.tablename = 'forum_reactions'
			and i.indexdef ilike '%unique%'
			and i.indexdef ilike '%(user_id, target_type, target_id, reaction)%'
	loop
		execute format('drop index if exists public.%I', index_name);
	end loop;
end $$;

create unique index if not exists idx_forum_reactions_user_target_unique
	on public.forum_reactions(user_id, target_type, target_id);

create table if not exists public.blog_reactions (
	id uuid primary key default gen_random_uuid(),
	post_id uuid not null references public.blog_posts(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	reaction public.reaction_type not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique(post_id, user_id)
);

create index if not exists idx_blog_reactions_post on public.blog_reactions(post_id);
create index if not exists idx_blog_reactions_user on public.blog_reactions(user_id);

drop trigger if exists trg_blog_reactions_updated_at on public.blog_reactions;
create trigger trg_blog_reactions_updated_at
before update on public.blog_reactions
for each row execute function public.set_updated_at();

alter table public.blog_reactions enable row level security;

drop policy if exists "blog_reactions_public_read" on public.blog_reactions;
create policy "blog_reactions_public_read" on public.blog_reactions
for select using (true);

drop policy if exists "blog_reactions_insert_own" on public.blog_reactions;
create policy "blog_reactions_insert_own" on public.blog_reactions
for insert with check (auth.uid() = user_id and public.is_active(auth.uid()));

drop policy if exists "blog_reactions_update_own" on public.blog_reactions;
create policy "blog_reactions_update_own" on public.blog_reactions
for update using (auth.uid() = user_id and public.is_active(auth.uid()))
with check (auth.uid() = user_id and public.is_active(auth.uid()));

drop policy if exists "blog_reactions_delete_own" on public.blog_reactions;
create policy "blog_reactions_delete_own" on public.blog_reactions
for delete using (auth.uid() = user_id or public.has_permission(auth.uid(), 'forum', 'moderate'));

create or replace function public.increment_karma_points(target_user_id uuid, points_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	next_value integer;
begin
	update public.profiles
	set karma_points = coalesce(karma_points, 0) + coalesce(points_delta, 0)
	where id = target_user_id
	returning karma_points into next_value;

	return coalesce(next_value, 0);
end;
$$;

do $$
begin
	begin
		alter publication supabase_realtime add table public.blog_reactions;
	exception
		when duplicate_object then
			null;
	end;
end $$;
