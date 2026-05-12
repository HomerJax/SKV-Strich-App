-- Ensure MVP/result notifications can be safely upserted by dedupe_key.
-- Required for user_notifications.upsert(... onConflict: "dedupe_key").

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'user_notifications'
      and constraint_name = 'user_notifications_dedupe_key_key'
      and constraint_type = 'UNIQUE'
  ) then
    alter table user_notifications
      add constraint user_notifications_dedupe_key_key
      unique (dedupe_key);
  end if;
end $$;
