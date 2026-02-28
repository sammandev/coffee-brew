-- Ensure admin role has full own-brew CRUD permissions and moderation access.

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.resource_key = 'brews'
where r.name = 'admin'
  and p.action_key in ('create', 'read', 'update', 'delete', 'moderate')
on conflict do nothing;
