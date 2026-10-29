-- Extend the pilot-only penalty transition: explicit saved wheel effects and
-- enabled payment destinations. Test penalties can be confirmed but NEVER
-- create cash receipts. No existing production records are modified.
create or replace function public.pilot_penalty_transition(
 p_penalty_id bigint, p_actor uuid, p_action text,
 p_payment_method text default null, p_note text default ''
) returns text
language plpgsql security invoker set search_path=''
as $$
declare
 v_penalty public.penalties%rowtype;
 v_state public.pilot_penalty_settlements%rowtype;
 v_spin public.penalty_wheel_spins%rowtype;
 v_manager boolean;
 v_member boolean;
 v_kind text;
 v_label text;
 v_cents integer;
 v_method text;
 v_tx bigint;
 v_account text;
 v_note text := btrim(coalesce(p_note,''));
 v_raw text;
 v_version integer;
 v_effect_data jsonb;
 v_effect text;
 v_effect_value text;
 v_methods jsonb;
begin
 if p_actor is null or p_penalty_id is null or p_action not in ('report','confirm','reject','reopen','cancel')
    or length(v_note)>500 then raise exception 'invalid_request' using errcode='P0001';end if;

 select * into v_penalty from public.penalties
 where id=p_penalty_id and club_id='12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid
 for update;
 if not found then raise exception 'penalty_not_found' using errcode='P0001';end if;
 select exists(select 1 from public.players where id=v_penalty.player_id and
    club_id=v_penalty.club_id and user_id=p_actor and is_guest=false)
 into v_member;
 select (
  exists(select 1 from public.club_memberships where club_id=v_penalty.club_id
      and user_id=p_actor and role='admin')
  or exists(select 1 from public.cashbox_managers where club_id=v_penalty.club_id
      and user_id=p_actor)
 ) into v_manager;
 if (p_action='report' and not v_member) or (p_action<>'report' and not v_manager)
 then raise exception 'not_authorized' using errcode='P0001';end if;
 select * into v_state from public.pilot_penalty_settlements where penalty_id=p_penalty_id for update;
 if p_action='report' then
   if v_penalty.resolved_at is not null or (found and v_state.state in ('confirmed','cancelled'))
   then raise exception 'already_closed' using errcode='P0001';end if;
   if found and v_state.state='reported' then return 'reported';end if;
   select * into v_spin from public.penalty_wheel_spins where penalty_id=p_penalty_id and club_id=v_penalty.club_id;
   v_kind := case when v_penalty.type='money' then 'money' else 'in_kind' end;
   v_label := coalesce(v_penalty.value,'Strafe');
   v_cents := null;
   if v_kind='money' then
     v_raw := regexp_replace(replace(btrim(coalesce(v_penalty.value,'')),',','.'),'[[:space:]€]','','g');
     if v_raw ~ '^[0-9]{1,6}(\.[0-9]{1,2})?$' then v_cents:=round(v_raw::numeric*100)::integer;end if;
   end if;
   if v_spin.id is not null then
      select item into v_effect_data from jsonb_array_elements(coalesce(v_spin.segments_snapshot,'[]'::jsonb)) item
       where item->>'id'=v_spin.outcome limit 1;
      v_effect :=nullif(v_effect_data->>'effect','');
      v_effect_value :=nullif(v_effect_data->>'effectValue','');
      if v_effect is not null then
        if v_effect='keep' then
          v_label:=coalesce(v_penalty.value,'Strafe')||' (Glücksrad: bleibt)';
        elsif v_effect='waive' then
          v_kind:='waived';v_cents:=null;v_label:=coalesce(v_spin.outcome_label,'Joker');
        elsif v_effect='halve' then
          if v_kind='money' and v_cents is not null then
            v_cents:=round(v_cents::numeric/2)::integer;
            v_label:='Halbierte Strafe: '||to_char(v_cents::numeric/100,'FM9999990D00')||' €';
          else
            v_label:=coalesce(v_penalty.value,'Strafe')||' (Halbierung nicht anwendbar)';
          end if;
        elsif v_effect='fixed_money' then
          v_raw:=replace(coalesce(v_effect_value,''),',','.');
          if v_raw !~ '^[0-9]{1,6}(\.[0-9]{1,2})?$'
            then raise exception 'invalid_wheel_amount' using errcode='P0001';end if;
          v_cents:=round(v_raw::numeric*100)::integer;
          v_kind:='money';
          v_label:=coalesce(v_spin.outcome_label,'Geldstrafe')||': '||to_char(v_cents::numeric/100,'FM9999990D00')||' €';
        elsif v_effect in ('task','goods') then
          v_kind:='in_kind';v_cents:=null;
          v_label:=coalesce(nullif(v_spin.outcome_label,''),'Aufgabe')
            || case when nullif(v_spin.outcome_detail,'') is not null then ' – '||v_spin.outcome_detail else '' end;
        else raise exception 'unknown_wheel_effect' using errcode='P0001';end if;
      else
        -- Legacy spins without explicit effect metadata retain their original meaning.
        if v_spin.outcome='usual' or lower(coalesce(v_spin.outcome_label,'')) like '%bleibt%'
           or lower(coalesce(v_spin.outcome_label,'')) like '%keine zusatzaufgabe%'
        then v_label:=coalesce(v_penalty.value,'Strafe')||' (Glücksrad: bleibt)';
        elsif v_spin.outcome='lucky' or lower(coalesce(v_spin.outcome_label,'')) like '%joker%'
        then v_kind:='waived';v_cents:=null;v_label:=coalesce(v_spin.outcome_label,'Joker');
        elsif lower(coalesce(v_spin.outcome_label,'')) like '%halb%' and v_kind='money' then
          v_cents:=round(v_cents::numeric/2)::integer;
          v_label:='Halbierte Strafe: '||to_char(v_cents::numeric/100,'FM9999990D00')||' €';
        else v_kind:='in_kind';v_cents:=null;
          v_label:=coalesce(nullif(v_spin.outcome_label,''),'Glücksrad-Aufgabe')
          || case when nullif(v_spin.outcome_detail,'') is not null then ' – '||v_spin.outcome_detail else '' end;
        end if;
      end if;
   end if;
   if v_kind='money' and coalesce(v_cents,0)<=0 then raise exception 'invalid_money_amount' using errcode='P0001';end if;
   v_method:=case when v_kind='money' then p_payment_method else null end;
   if v_kind='money' and (v_method is null or v_method not in ('cash','paypal','paypal_me','sumup','other'))
   then raise exception 'payment_method_required' using errcode='P0001';end if;
   -- Only admin-enabled payment methods are accepted by the DB, not just UI.
   select coalesce(config->'payments','{"cashEnabled":true}'::jsonb) into v_methods
   from public.cashbox_pilot_structures where club_id=v_penalty.club_id;
   v_methods:=coalesce(v_methods,'{"cashEnabled":true}'::jsonb);
   if v_kind='money' and not (
     (v_method='cash' and coalesce((v_methods->>'cashEnabled')::boolean,true))
     or (v_method='paypal' and coalesce(v_methods->>'paypalPoolUrl','')<>'')
     or (v_method='paypal_me' and coalesce(v_methods->>'paypalMeUrl','')<>'')
     or (v_method='sumup' and coalesce(v_methods->>'sumupUrl','')<>'')
   ) then raise exception 'payment_method_disabled' using errcode='P0001';end if;
   -- A wheel can turn a money fine into a non-money challenge. Ignore
   -- a preselected payment method in that case, never charge it.
   insert into public.pilot_penalty_settlements(
     penalty_id,club_id,state,fulfillment_kind,effective_label,amount_cents,payment_method,
     report_note,reported_by,reported_at,reviewed_by,reviewed_at,review_note,transaction_id
   ) values(p_penalty_id,v_penalty.club_id,'reported',v_kind,v_label,v_cents,v_method,
            v_note,p_actor,now(),null,null,'',null)
   on conflict(penalty_id) do update set
      state='reported',fulfillment_kind=excluded.fulfillment_kind,
      effective_label=excluded.effective_label,amount_cents=excluded.amount_cents,
      payment_method=excluded.payment_method,report_note=excluded.report_note,
      reported_by=excluded.reported_by,reported_at=excluded.reported_at,
      reviewed_by=null,reviewed_at=null,review_note='',transaction_id=null,
      updated_at=now();
   insert into public.pilot_penalty_settlement_events(penalty_id,club_id,actor_id,action,details)
   values(p_penalty_id,v_penalty.club_id,p_actor,'reported',
         jsonb_build_object('kind',v_kind,'label',v_label,'amount_cents',v_cents,'method',v_method,'note',v_note));
   return 'reported';
 end if;

 if p_action='confirm' then
   if v_state.penalty_id is null or v_state.state<>'reported' or v_penalty.resolved_at is not null
   then raise exception 'not_reported' using errcode='P0001';end if;
   v_tx:=null;
   if v_state.fulfillment_kind='money' and coalesce(v_penalty.source_key,'') not like 'test:%' then
      if v_state.amount_cents is null or v_state.amount_cents<=0 then raise exception 'invalid_amount' using errcode='P0001';end if;
      v_account:=case when v_state.payment_method='cash' then 'cash'
                   when v_state.payment_method in ('paypal','paypal_me') then 'paypal'
                   else null end;
      insert into public.cash_transactions(
        club_id,amount_cents,kind,category,title,notes,source_type,source_id,
        source_key,account,created_by
      ) values(
        v_penalty.club_id,v_state.amount_cents,'income','Strafen',
        coalesce(nullif(v_penalty.reason,''),'Strafe') || ' · ' || v_state.effective_label,
        'Zahlungseingang vom Kassenwart geprüft. '||coalesce(v_state.report_note,''),
        'penalty',p_penalty_id,
        'pilot:penalty:'||p_penalty_id||':v'||v_state.version||':payment',v_account,p_actor
      ) returning id into v_tx;
   end if;
   update public.penalties set resolved_at=now(),cash_transaction_id=v_tx
   where id=p_penalty_id;
   update public.pilot_penalty_settlements
      set state='confirmed',reviewed_by=p_actor,reviewed_at=now(),
          review_note=v_note,transaction_id=v_tx,updated_at=now()
      where penalty_id=p_penalty_id;
   insert into public.pilot_penalty_settlement_events(penalty_id,club_id,actor_id,action,details)
   values(p_penalty_id,v_penalty.club_id,p_actor,'confirmed',
       jsonb_build_object('transaction_id',v_tx,'kind',v_state.fulfillment_kind,
                          'amount_cents',v_state.amount_cents,'method',v_state.payment_method,'note',v_note));
   return 'confirmed';
 end if;
 if p_action='reject' then
   if v_state.penalty_id is null or v_state.state<>'reported' then
     raise exception 'not_reported' using errcode='P0001';end if;
   if length(v_note)<3 then raise exception 'reason_required' using errcode='P0001';end if;
   update public.pilot_penalty_settlements
   set state='rejected',reviewed_by=p_actor,reviewed_at=now(),
       review_note=v_note,updated_at=now()
   where penalty_id=p_penalty_id;
   insert into public.pilot_penalty_settlement_events(penalty_id,club_id,actor_id,action,details)
   values(p_penalty_id,v_penalty.club_id,p_actor,'rejected',jsonb_build_object('reason',v_note));
   return 'rejected';
 end if;
 if p_action='cancel' then
   if v_penalty.resolved_at is not null or (v_state.penalty_id is not null and v_state.state='confirmed')
   then raise exception 'must_reopen_first' using errcode='P0001';end if;
   if length(v_note)<3 then raise exception 'reason_required' using errcode='P0001';end if;
   insert into public.pilot_penalty_settlements(penalty_id,club_id,state,fulfillment_kind,effective_label,reviewed_by,reviewed_at,review_note)
   values(p_penalty_id,v_penalty.club_id,'cancelled','waived','Storniert/entschuldigt',p_actor,now(),v_note)
   on conflict(penalty_id) do update set state='cancelled',
      reviewed_by=p_actor,reviewed_at=now(),review_note=v_note,transaction_id=null,updated_at=now();
   update public.penalties set resolved_at=now(),cash_transaction_id=null where id=p_penalty_id;
   insert into public.pilot_penalty_settlement_events(penalty_id,club_id,actor_id,action,details)
   values(p_penalty_id,v_penalty.club_id,p_actor,'cancelled',jsonb_build_object('reason',v_note));
   return 'cancelled';
 end if;
 if p_action='reopen' then
   if v_state.penalty_id is null or v_state.state not in ('confirmed','cancelled')
   then raise exception 'not_closed' using errcode='P0001';end if;
   if length(v_note)<3 then raise exception 'reason_required' using errcode='P0001';end if;
   if v_state.transaction_id is not null then
      select account into v_account from public.cash_transactions where id=v_state.transaction_id
       and club_id=v_penalty.club_id;
      insert into public.cash_transactions(
       club_id,amount_cents,kind,category,title,source_type,source_id,source_key,
       reversed_transaction_id,account,created_by,notes
      ) values(
       v_penalty.club_id,-v_state.amount_cents,'reversal','Strafen',
       'Korrektur: '||coalesce(v_penalty.reason,'Strafe'),
       'penalty_reversal',p_penalty_id,
       'pilot:penalty:'||p_penalty_id||':v'||v_state.version||':reversal',
       v_state.transaction_id,v_account,p_actor,v_note
      );
   end if;
   update public.penalties set resolved_at=null,cash_transaction_id=null where id=p_penalty_id;
   update public.pilot_penalty_settlements set state='open',version=version+1,
      transaction_id=null,reviewed_by=p_actor,reviewed_at=now(),review_note=v_note,updated_at=now()
   where penalty_id=p_penalty_id;
   insert into public.pilot_penalty_settlement_events(penalty_id,club_id,actor_id,action,details)
   values(p_penalty_id,v_penalty.club_id,p_actor,'reopened',jsonb_build_object('reason',v_note));
   return 'open';
 end if;
 raise exception 'invalid_action' using errcode='P0001';
end $$;

revoke all on function public.pilot_penalty_transition(bigint,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.pilot_penalty_transition(bigint,uuid,text,text,text) to service_role;
