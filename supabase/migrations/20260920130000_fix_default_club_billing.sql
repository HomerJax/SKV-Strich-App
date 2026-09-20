update public.club_billing
set
  plan_key = 'free',
  status = 'active',
  trial_ends_at = null,
  pro_ends_at = null,
  billing_note = 'Korrigiert: alter abgelaufener Supercup-Trial auf kostenlosen Startplan umgestellt.',
  updated_at = now()
where plan_key = 'supercup_trial'
  and trial_ends_at = '2026-07-31T21:59:59.000Z'::timestamptz
  and pro_ends_at = '2026-07-31T21:59:59.000Z'::timestamptz;
