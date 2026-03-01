-- Allow anyone (including anonymous) to read non-private profiles.
-- This is needed so guest + regular users can see reviewer display names,
-- badges, avatars, etc. on brew detail and forum pages.
-- Private profiles remain readable only by the owner or an admin.
create policy "profiles_public_read_non_private" on public.profiles
for select
using (is_profile_private = false);
