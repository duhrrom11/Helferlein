-- Only drains already authorized jobs. The public worker cannot select a recipient,
-- create alarms, change deadlines or release keys. It sends no mail without configured secrets.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('estate-mail-delivery-v2','* * * * *',$job$
 select net.http_post(
  url:='https://avapuibsidubuzxjtyld.supabase.co/functions/v1/estate-emergency',
  headers:='{"Content-Type":"application/json","apikey":"sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC"}'::jsonb,
  body:='{"action":"worker"}'::jsonb,timeout_milliseconds:=20000
 );
$job$);
