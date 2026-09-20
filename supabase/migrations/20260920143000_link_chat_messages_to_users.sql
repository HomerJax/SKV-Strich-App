alter table public.club_chat_messages
  drop constraint if exists club_chat_messages_user_id_fkey;

alter table public.club_chat_messages
  add constraint club_chat_messages_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;
