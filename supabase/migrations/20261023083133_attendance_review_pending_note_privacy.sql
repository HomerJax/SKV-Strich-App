drop policy if exists attendance_reviews_read_club on public.session_attendance_reviews;
create policy attendance_reviews_read_scope
on public.session_attendance_reviews
for select to authenticated
using (
  public.is_member_of_club(club_id)
  and (
    status = 'penalized'
    or public.is_admin_of_club(club_id)
    or exists (
      select 1 from public.players p
      where p.id = player_id and p.club_id = session_attendance_reviews.club_id
        and p.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.players lead
      where lead.club_id = session_attendance_reviews.club_id
        and lead.user_id = (select auth.uid())
        and lead.can_lead_training = true
    )
  )
);
