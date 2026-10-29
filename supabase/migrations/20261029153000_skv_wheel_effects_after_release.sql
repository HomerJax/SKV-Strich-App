-- Run only after SKV app version supporting all explicit wheel effects is live.
-- Lock actual consequences for SKV's eight approved wheel fields.
-- No odds or visual field sizes are changed. Preserve any custom weights.
update public.penalty_wheel_settings w
set segments = (
 select jsonb_agg(
   s.segment || jsonb_build_object(
      'effect',case s.segment->>'id'
        when 'lucky' then 'waive'
        when 'usual' then 'task'
        when 'confession' then 'goods'
        when 'challenge' then 'double'
        when 'w_mvkt194w_zv5rok' then 'halve'
        when 'w_mvkt19gx_ezk7jv' then 'task'
        when 'song' then 'goods'
        when 'cones' then 'fixed_money'
        else 'task' end,
      'effectValue',case when s.segment->>'id'='cones' then '5' else '' end
   ) order by s.ordinality
 )
 from jsonb_array_elements(w.segments) with ordinality s(segment,ordinality)
), updated_at=now()
where w.club_id='108590d9-0877-4787-90a5-4679615b3b76'::uuid
 and jsonb_array_length(w.segments)=8;

