-- Winner photos are delivered through signed URLs, so the bucket does not need
-- public object access. Restrict direct storage access to the session's club.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg']::text[]
where id = 'session-photos';

drop policy if exists session_photos_insert_authenticated on storage.objects;
drop policy if exists session_photos_select_authenticated on storage.objects;
drop policy if exists session_photos_update_authenticated on storage.objects;
drop policy if exists session_photos_delete_authenticated on storage.objects;

create policy session_photos_select_club_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'session-photos'
  and name ~ '^sessions/[0-9]+/'
  and exists (
    select 1
    from public.sessions s
    where s.id = split_part(name, '/', 2)::bigint
      and (
        public.is_member_of_club(s.club_id)
        or exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.is_power_user = true
        )
      )
  )
);

create policy session_photos_delete_club_member
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'session-photos'
  and name ~ '^sessions/[0-9]+/'
  and exists (
    select 1
    from public.sessions s
    where s.id = split_part(name, '/', 2)::bigint
      and (
        public.is_member_of_club(s.club_id)
        or exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.is_power_user = true
        )
      )
  )
);
