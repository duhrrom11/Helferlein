-- Private encrypted file objects. Filenames, file keys and wishes stay inside owner/read ciphertext.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('estate-documents','estate-documents',false,5242909,array['application/octet-stream']);
create policy estate_documents_owner_read on storage.objects for select to authenticated
 using(bucket_id='estate-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy estate_documents_owner_insert on storage.objects for insert to authenticated
 with check(bucket_id='estate-documents' and name ~ ('^'||(select auth.uid())::text||'/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'));
create policy estate_documents_owner_delete on storage.objects for delete to authenticated
 using(bucket_id='estate-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- No UPDATE policy: objects are immutable and each upload has a fresh UUID.
alter table estate_private.read_vaults add column attachment_ids jsonb not null default '[]'::jsonb,
 add column alarm_contact_id text, add column review_reminders_enabled boolean not null default false,
 add column review_days integer not null default 180 check(review_days in (90,180,365)),
 add column last_reviewed timestamptz, add column next_review timestamptz not null default now()+interval '180 days';
alter table estate_private.delivery_jobs drop constraint delivery_jobs_kind_check;
alter table estate_private.delivery_jobs add constraint delivery_jobs_kind_check
 check(kind in ('alarm','reminder','reporter-started','reporter-stopped','update-reminder'));
create table estate_private.activity(
 id bigint generated always as identity primary key,
 owner_id uuid not null references estate_private.read_vaults(owner_id) on delete cascade,
 created_at timestamptz not null default now(), kind text not null,
 actor_contact_id text, detail text
);
create index estate_activity_owner_time on estate_private.activity(owner_id,created_at desc,id desc);
alter table estate_private.activity enable row level security;
revoke all on estate_private.activity from public,anon,authenticated;
revoke all on sequence estate_private.activity_id_seq from public,anon,authenticated;
create function estate_private.record_alarm_activity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.alarm_id is distinct from old.alarm_id and new.alarm_id is not null then
  insert into estate_private.activity(owner_id,kind,actor_contact_id) values(new.owner_id,'alarm_requested',new.alarm_contact_id);
 end if;
 if new.alarm_started_at is not null and old.alarm_started_at is null then
  insert into estate_private.activity(owner_id,kind) values(new.owner_id,'alarm_started');
 end if;
 if new.alarm_canceled_at is not null and old.alarm_canceled_at is null then
  insert into estate_private.activity(owner_id,kind) values(new.owner_id,'alarm_stopped');
 end if;
 return new;
end $$;
revoke all on function estate_private.record_alarm_activity() from public,anon,authenticated;
create trigger estate_alarm_activity after update on estate_private.read_vaults for each row execute function estate_private.record_alarm_activity();
create function estate_private.record_mail_activity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.delivered_at is not null and old.delivered_at is null and new.leased_until is not null then
  -- Suppressed stale jobs are marked complete too; log only actual provider acknowledgements.
  if current_setting('estate.mail_ack',true)='yes' then
   insert into estate_private.activity(owner_id,kind,detail) values(new.owner_id,'mail_accepted',new.kind);
  end if;
 end if;
 return new;
end $$;
revoke all on function estate_private.record_mail_activity() from public,anon,authenticated;
create trigger estate_mail_activity after update on estate_private.delivery_jobs for each row execute function estate_private.record_mail_activity();

create or replace function public.estate_release_v2(p_action text,p_owner uuid default null,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v estate_private.read_vaults%rowtype; g estate_private.read_guardians%rowtype;
 keys jsonb; n integer; h text; second_hash text; j estate_private.delivery_jobs%rowtype; result jsonb;
begin
 if p_action='limit' then
  h:=p_data->>'bucket';
  if h is null or length(h)>150 then return '{"allowed":false}'; end if;
  insert into estate_private.request_limits(bucket,window_at,hits) values(h,now(),1)
  on conflict(bucket) do update set hits=case when estate_private.request_limits.window_at < now()-interval '1 minute' then 1 else estate_private.request_limits.hits+1 end,
   window_at=case when estate_private.request_limits.window_at < now()-interval '1 minute' then now() else estate_private.request_limits.window_at end
  returning hits into n;
  delete from estate_private.request_limits where window_at<now()-interval '2 hours';
  return jsonb_build_object('allowed',n<=60);
 end if;
 if p_action='claim' then
  for v in select * from estate_private.read_vaults where review_reminders_enabled and next_review<=now() for update skip locked limit 10 loop
   insert into estate_private.delivery_jobs(owner_id,kind) values(v.owner_id,'update-reminder');
   update estate_private.read_vaults set next_review=now()+make_interval(days=>review_days) where owner_id=v.owner_id;
  end loop;
  -- Reminder jobs never change alarm state. Consent is per owner, disabled by default.
  for v in select * from estate_private.read_vaults where reminders_enabled and next_reminder<=now() for update skip locked limit 10 loop
   insert into estate_private.delivery_jobs(owner_id,kind) values(v.owner_id,'reminder');
   update estate_private.read_vaults set next_reminder=now()+make_interval(days=>reminder_days) where owner_id=v.owner_id;
  end loop;
  select * into j from estate_private.delivery_jobs where delivered_at is null and attempts<20 and (leased_until is null or leased_until<now()) order by created_at for update skip locked limit 1;
  if not found then return '{}'::jsonb; end if;
  update estate_private.delivery_jobs set attempts=attempts+1,leased_until=now()+interval '5 minutes' where id=j.id;
  select * into v from estate_private.read_vaults where owner_id=j.owner_id;
  if j.kind in ('alarm','reporter-started') and (v.alarm_id is distinct from j.alarm_id or v.alarm_canceled_at is not null) then
   update estate_private.delivery_jobs set delivered_at=now() where id=j.id; return '{}'::jsonb;
  end if;
  if j.kind='update-reminder' and (not v.review_reminders_enabled or v.last_reviewed>=j.created_at) then
   update estate_private.delivery_jobs set delivered_at=now() where id=j.id;return '{}'::jsonb;
  end if;
  return jsonb_build_object('id',j.id,'owner',j.owner_id,'kind',j.kind,'alarm',j.alarm_id,'recipient',j.recipient_email,'deadline',j.deadline,'eventTime',j.event_time);
 end if;
 if p_action='delivered' then
  perform set_config('estate.mail_ack','yes',true);
  select * into j from estate_private.delivery_jobs where id=(p_data->>'id')::uuid;
  if not found then return '{}'::jsonb; end if;
  -- Same owner lock order as cancellation/publish: no stale callback can revive a canceled alarm.
  select * into v from estate_private.read_vaults where owner_id=j.owner_id for update;
  select * into j from estate_private.delivery_jobs where id=j.id for update;
  if j.delivered_at is null then
   update estate_private.delivery_jobs set delivered_at=now() where id=j.id;
   if j.kind='alarm' then
    update estate_private.read_vaults set alarm_started_at=now(),alarm_deadline=now()+interval '24 hours'
     where owner_id=j.owner_id and alarm_id=j.alarm_id and alarm_canceled_at is null and alarm_started_at is null;
   end if;
  end if;
  return '{"ok":true}';
 end if;
 if p_action in ('publish','status','cancel','review') then
  if p_owner is null or not exists(select 1 from auth.sessions where id=(p_data->>'session')::uuid and user_id=p_owner) then return '{"error":"login_required"}'; end if;
  -- Serialize initial creation too, without relying on an uncommitted row.
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,2719));
  select * into v from estate_private.read_vaults where owner_id=p_owner for update;
  if p_action='publish' then
   keys:=p_data->'guardians';
   if p_data ? 'attachmentIds' then
    if jsonb_typeof(p_data->'attachmentIds') is distinct from 'array' or jsonb_array_length(p_data->'attachmentIds')>200 then raise exception 'invalid_files'; end if;
    if exists(select 1 from jsonb_array_elements_text(p_data->'attachmentIds') x where x !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
      or not exists(select 1 from storage.objects o where o.bucket_id='estate-documents' and o.name=p_owner::text||'/'||x)) then raise exception 'missing_files'; end if;
   end if;
   if keys is null or jsonb_typeof(keys)<>'array' or jsonb_array_length(keys)>10 then raise exception 'invalid_guardians'; end if;
   n:=jsonb_array_length(keys);
   if (select count(distinct x->>'id') from jsonb_array_elements(keys) x)<>n or
      (select count(distinct x->>'hash') from jsonb_array_elements(keys) x)<>n or
      exists(select 1 from jsonb_array_elements(keys) x where coalesce(x->>'id','')='' or length(x->>'id')>100 or coalesce(x->>'hash','')!~'^[a-f0-9]{64}$' or jsonb_typeof(x->'envelope') is distinct from 'object') then raise exception 'invalid_guardians'; end if;
   if p_data->>'vaultId' is null or jsonb_typeof(p_data->'content') is distinct from 'object' or octet_length(p_data::text)>1500000 then raise exception 'invalid_content'; end if;
   if v.owner_id is not null and (v.vault_id<>p_data->>'vaultId' or v.version<>(p_data->>'version')::bigint) then return '{"error":"conflict"}'; end if;
   if v.owner_id is null and coalesce((p_data->>'version')::bigint,0)<>0 then return '{"error":"conflict"}'; end if;
   -- Bind to the authenticated owner's actual backup; never to a caller-chosen other vault.
   if not exists(select 1 from public.vault_cloud_snapshots where owner_user_id=p_owner and vault_id=p_data->>'vaultId') then return '{"error":"backup_required"}'; end if;
   insert into estate_private.read_vaults(owner_id,vault_id,content,version) values(p_owner,p_data->>'vaultId',p_data->'content',1)
    on conflict(owner_id) do update set content=excluded.content,version=estate_private.read_vaults.version+1,updated_at=now();
   -- Any trustee membership/key change cancels a pending or expired single-person grant.
   if exists((select contact_id,key_hash from estate_private.read_guardians where owner_id=p_owner except select x->>'id',x->>'hash' from jsonb_array_elements(keys) x)
    union all (select x->>'id',x->>'hash' from jsonb_array_elements(keys) x except select contact_id,key_hash from estate_private.read_guardians where owner_id=p_owner)) then
    insert into estate_private.activity(owner_id,kind) values(p_owner,'people_updated');
    update estate_private.read_vaults set alarm_canceled_at=now() where owner_id=p_owner and alarm_id is not null;
   end if;
   if exists(select 1 from jsonb_array_elements(keys) x where x ? 'email' and (length(x->>'email')>254 or x->>'email' !~ '^[^[:space:]<>@]+@[^[:space:]<>@]+[.][^[:space:]<>@]+$')) then raise exception 'invalid_guardian_email'; end if;
   delete from estate_private.read_guardians where owner_id=p_owner;
   insert into estate_private.read_guardians(owner_id,contact_id,key_hash,envelope,notification_email) select p_owner,x->>'id',x->>'hash',x->'envelope',x->>'email' from jsonb_array_elements(keys) x;
   update estate_private.read_vaults set next_reminder=case when reminder_days is distinct from (p_data->>'reminderDays')::integer or reminders_enabled is distinct from coalesce((p_data->>'remindersEnabled')::boolean,false) then now()+make_interval(days=>(p_data->>'reminderDays')::integer) else next_reminder end, reminder_days=(p_data->>'reminderDays')::integer,reminders_enabled=coalesce((p_data->>'remindersEnabled')::boolean,false) where owner_id=p_owner;
   update estate_private.read_vaults set attachment_ids=coalesce(p_data->'attachmentIds',attachment_ids),
    next_review=case when review_days is distinct from coalesce((p_data->>'reviewDays')::integer,180) or review_reminders_enabled is distinct from coalesce((p_data->>'reviewRemindersEnabled')::boolean,false) then now()+make_interval(days=>coalesce((p_data->>'reviewDays')::integer,180)) else next_review end,
    review_days=coalesce((p_data->>'reviewDays')::integer,180),review_reminders_enabled=coalesce((p_data->>'reviewRemindersEnabled')::boolean,false)
    where owner_id=p_owner;
   insert into estate_private.activity(owner_id,kind) values(p_owner,'vault_saved');
   return (select jsonb_build_object('version',version) from estate_private.read_vaults where owner_id=p_owner);
  end if;
  if p_action='review' and v.owner_id is not null then
   update estate_private.read_vaults set last_reviewed=now(),next_review=now()+make_interval(days=>review_days) where owner_id=p_owner returning * into v;
   insert into estate_private.activity(owner_id,kind) values(p_owner,'reviewed');
  end if;
  if p_action='cancel' and v.owner_id is not null then
   update estate_private.read_vaults set alarm_canceled_at=case when alarm_id is null then null else now() end,
    alarm_block_until=case when alarm_id is not null and alarm_canceled_at is null then now()+interval '10 minutes' else alarm_block_until end,
    last_check_in=now(),next_reminder=now()+make_interval(days=>reminder_days) where owner_id=p_owner;
   insert into estate_private.activity(owner_id,kind) values(p_owner,'owner_checkin');
   select * into v from estate_private.read_vaults where owner_id=p_owner;
  end if;
  return jsonb_build_object('version',coalesce(v.version,0),'status',case when v.alarm_id is null or v.alarm_canceled_at is not null then 'normal' when v.alarm_started_at is null then 'notifying' when v.alarm_deadline>now() then 'countdown' else 'released' end,
   'deadline',v.alarm_deadline,'serverTime',now(),'lastCheckIn',v.last_check_in,'nextReminder',v.next_reminder,'lastReviewed',v.last_reviewed,'nextReview',v.next_review,
   'activity',coalesce((select jsonb_agg(t.event order by t.created_at desc,t.id desc) from
     (select a.id,a.created_at,jsonb_build_object('id',a.id,'at',a.created_at,'kind',a.kind,'actor',a.actor_contact_id,'detail',a.detail) event
      from estate_private.activity a where a.owner_id=p_owner order by a.created_at desc,a.id desc limit 50) t),'[]'::jsonb));
 end if;
 -- Trustee route: plaintext random bearer keys never enter the database.
 h:=p_data->>'hash';
 select * into g from estate_private.read_guardians where key_hash=h;
 if not found then return '{"error":"invalid_keys"}'; end if;
 select * into v from estate_private.read_vaults where owner_id=g.owner_id for update;
 -- Re-check after obtaining owner lock: concurrent revocation must be authoritative.
 select * into g from estate_private.read_guardians where key_hash=h and owner_id=v.owner_id;
 if not found then return '{"error":"invalid_keys"}'; end if;
 if p_action='alarm' then
  if v.alarm_block_until>now() then return '{"error":"cooldown"}'; end if;
  if v.alarm_id is null or v.alarm_canceled_at is not null then
   if g.notification_email is null then return '{"error":"notification_contact_missing"}'; end if;
   update estate_private.read_vaults set alarm_contact_id=g.contact_id,reporter_email=g.notification_email,alarm_id=gen_random_uuid(),alarm_requested_at=now(),alarm_started_at=null,alarm_deadline=null,alarm_canceled_at=null where owner_id=v.owner_id returning * into v;
   insert into estate_private.delivery_jobs(owner_id,kind,alarm_id) values(v.owner_id,'alarm',v.alarm_id);
  end if;
 elsif p_action in ('open','file') then
  second_hash:=p_data->>'secondHash';
  if second_hash is not null then
   if second_hash=h or not exists(select 1 from estate_private.read_guardians where key_hash=second_hash and owner_id=v.owner_id and contact_id<>g.contact_id) then return '{"error":"invalid_keys"}'; end if;
  elsif v.alarm_started_at is null or v.alarm_deadline>now() or v.alarm_canceled_at is not null then
   return jsonb_build_object('error','two_keys_required','deadline',v.alarm_deadline);
  end if;
  if p_action='file' then
   if not (v.attachment_ids ? coalesce(p_data->>'fileId','')) then return '{"error":"file_unavailable"}'; end if;
   insert into estate_private.activity(owner_id,kind,actor_contact_id,detail) values(v.owner_id,'file_access',g.contact_id,case when second_hash is null then 'emergency' else 'two_keys' end);
   return jsonb_build_object('path',v.owner_id::text||'/'||(p_data->>'fileId'));
  end if;
  insert into estate_private.activity(owner_id,kind,actor_contact_id,detail) values(v.owner_id,'read_access',g.contact_id,case when second_hash is null then 'emergency' else 'two_keys' end);
  return jsonb_build_object('content',v.content,'envelope',g.envelope,'version',v.version);
 elsif p_action<>'trustee-status' then return '{"error":"invalid_action"}';
 end if;
 return jsonb_build_object('status',case when v.alarm_id is null or v.alarm_canceled_at is not null then 'normal' when v.alarm_started_at is null then 'notifying' when v.alarm_deadline>now() then 'countdown' else 'released' end,'deadline',v.alarm_deadline,'serverTime',now());
end $$;
revoke all on function public.estate_release_v2(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.estate_release_v2(text,uuid,jsonb) to service_role;
