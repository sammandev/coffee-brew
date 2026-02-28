-- Phase 2 DM privacy hardening:
-- Keep DMs private by default and allow moderator visibility only through explicit
-- superuser-only report context endpoints that use service-role access.

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own" on public.user_blocks
for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own" on public.user_blocks
for insert with check (auth.uid() = blocker_id and public.is_active(auth.uid()));

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own" on public.user_blocks
for delete using (auth.uid() = blocker_id);

drop policy if exists "dm_conversations_select_participant" on public.dm_conversations;
create policy "dm_conversations_select_participant" on public.dm_conversations
for select using (public.is_dm_participant(id, auth.uid()));

drop policy if exists "dm_conversations_insert_active_user" on public.dm_conversations;
create policy "dm_conversations_insert_active_user" on public.dm_conversations
for insert with check (auth.uid() = created_by and public.is_active(auth.uid()));

drop policy if exists "dm_conversations_update_participant" on public.dm_conversations;
create policy "dm_conversations_update_participant" on public.dm_conversations
for update using (public.is_dm_participant(id, auth.uid()))
with check (public.is_dm_participant(id, auth.uid()));

drop policy if exists "dm_participants_select_participant" on public.dm_participants;
create policy "dm_participants_select_participant" on public.dm_participants
for select using (public.is_dm_participant(conversation_id, auth.uid()));

drop policy if exists "dm_participants_insert_by_creator_or_moderator" on public.dm_participants;
create policy "dm_participants_insert_by_creator_or_moderator" on public.dm_participants
for insert with check (
  public.is_active(auth.uid())
  and exists(select 1 from public.dm_conversations c where c.id = conversation_id and c.created_by = auth.uid())
);

drop policy if exists "dm_participants_update_self_or_moderator" on public.dm_participants;
create policy "dm_participants_update_self_or_moderator" on public.dm_participants
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "dm_messages_select_participant" on public.dm_messages;
create policy "dm_messages_select_participant" on public.dm_messages
for select using (public.is_dm_participant(conversation_id, auth.uid()));

drop policy if exists "dm_messages_insert_participant" on public.dm_messages;
create policy "dm_messages_insert_participant" on public.dm_messages
for insert with check (
  auth.uid() = sender_id
  and public.is_active(auth.uid())
  and public.is_dm_participant(conversation_id, auth.uid())
);

drop policy if exists "dm_messages_update_sender_or_moderator" on public.dm_messages;
create policy "dm_messages_update_sender_or_moderator" on public.dm_messages
for update using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

drop policy if exists "dm_messages_delete_sender_or_moderator" on public.dm_messages;
create policy "dm_messages_delete_sender_or_moderator" on public.dm_messages
for delete using (auth.uid() = sender_id);

drop policy if exists "dm_message_attachments_select_participant" on public.dm_message_attachments;
create policy "dm_message_attachments_select_participant" on public.dm_message_attachments
for select using (
  exists(
    select 1
    from public.dm_messages m
    where m.id = message_id
      and public.is_dm_participant(m.conversation_id, auth.uid())
  )
);

drop policy if exists "dm_message_attachments_insert_sender" on public.dm_message_attachments;
create policy "dm_message_attachments_insert_sender" on public.dm_message_attachments
for insert with check (
  exists(
    select 1
    from public.dm_messages m
    where m.id = message_id
      and m.sender_id = auth.uid()
  )
);

drop policy if exists "dm_message_attachments_delete_sender_or_moderator" on public.dm_message_attachments;
create policy "dm_message_attachments_delete_sender_or_moderator" on public.dm_message_attachments
for delete using (
  exists(
    select 1
    from public.dm_messages m
    where m.id = message_id
      and m.sender_id = auth.uid()
  )
);

drop policy if exists "dm_reports_insert_participant" on public.dm_reports;
create policy "dm_reports_insert_participant" on public.dm_reports
for insert with check (
  auth.uid() = reporter_id
  and public.is_dm_participant(conversation_id, auth.uid())
);

drop policy if exists "dm_reports_select_reporter_or_superuser" on public.dm_reports;
create policy "dm_reports_select_reporter_or_superuser" on public.dm_reports
for select using (auth.uid() = reporter_id or public.user_role(auth.uid()) = 'superuser');

drop policy if exists "dm_reports_update_superuser_only" on public.dm_reports;
create policy "dm_reports_update_superuser_only" on public.dm_reports
for update using (public.user_role(auth.uid()) = 'superuser')
with check (public.user_role(auth.uid()) = 'superuser');
