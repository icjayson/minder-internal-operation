-- ============================================================================
-- Run the delayed activity-alert worker every minute from Supabase Cron.
--
-- Vercel Hobby only permits daily cron jobs, so the database calls the existing
-- Vercel API worker instead. The production URL and shared CRON_SECRET stay
-- encrypted in Supabase Vault and are never stored in this migration.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.configure_activity_alert_cron(
  app_url text,
  cron_secret text
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  app_url_secret_id uuid;
  cron_secret_id uuid;
  normalized_app_url text := regexp_replace(trim(app_url), '/+$', '');
begin
  if normalized_app_url !~ '^https://' then
    raise exception 'app_url must be a production HTTPS URL';
  end if;
  if length(trim(cron_secret)) < 16 then
    raise exception 'cron_secret must contain at least 16 characters';
  end if;

  select id into app_url_secret_id
  from vault.decrypted_secrets
  where name = 'minder_activity_alert_app_url'
  limit 1;

  if app_url_secret_id is null then
    perform vault.create_secret(
      normalized_app_url,
      'minder_activity_alert_app_url',
      'Production app URL used by the Supabase activity-alert cron'
    );
  else
    perform vault.update_secret(app_url_secret_id, normalized_app_url);
  end if;

  select id into cron_secret_id
  from vault.decrypted_secrets
  where name = 'minder_activity_alert_cron_secret'
  limit 1;

  if cron_secret_id is null then
    perform vault.create_secret(
      trim(cron_secret),
      'minder_activity_alert_cron_secret',
      'Shared secret for the delayed activity-alert worker'
    );
  else
    perform vault.update_secret(cron_secret_id, trim(cron_secret));
  end if;
end;
$$;

revoke all on function public.configure_activity_alert_cron(text, text) from public, anon, authenticated;

create or replace function public.invoke_activity_alert_worker()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  app_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into app_url
  from vault.decrypted_secrets
  where name = 'minder_activity_alert_app_url'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'minder_activity_alert_cron_secret'
  limit 1;

  -- The cron can be installed before its secrets are configured. In that state
  -- it safely no-ops instead of issuing an unauthenticated external request.
  if app_url is null or cron_secret is null then
    return null;
  end if;

  select net.http_post(
    url := app_url || '/api/process-activity-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := jsonb_build_object('source', 'supabase_cron'),
    timeout_milliseconds := 30000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_activity_alert_worker() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'minder-activity-alert-worker'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'minder-activity-alert-worker',
    '* * * * *',
    'select public.invoke_activity_alert_worker();'
  );
end;
$$;

-- One-time setup after deployment (run in Supabase SQL Editor):
-- select public.configure_activity_alert_cron(
--   'https://YOUR-PRODUCTION-DOMAIN',
--   'THE-SAME-LONG-VALUE-AS-VERCEL-CRON_SECRET'
-- );
