-- Event match reports are metadata on event sessions, not training game results.
-- Existing sessions remain unchanged; all existing events default to a general event.
alter table public.sessions
  add column if not exists event_kind text not null default 'event',
  add column if not exists event_title text,
  add column if not exists event_score_for integer,
  add column if not exists event_score_against integer,
  add column if not exists event_report text,
  add column if not exists event_photo_path text;

alter table public.sessions
  add constraint sessions_event_kind_check
    check (event_kind in ('event', 'match')),
  add constraint sessions_event_title_length_check
    check (event_title is null or char_length(event_title) <= 160),
  add constraint sessions_event_report_length_check
    check (event_report is null or char_length(event_report) <= 500),
  add constraint sessions_event_score_pair_check
    check ((event_score_for is null) = (event_score_against is null)),
  add constraint sessions_event_scores_valid_check
    check (
      (event_score_for is null or event_score_for between 0 and 999)
      and (event_score_against is null or event_score_against between 0 and 999)
    );
-- event_score_* are deliberately never inserted into public.results.
