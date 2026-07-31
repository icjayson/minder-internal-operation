# Activity alert scheduler on Vercel Hobby

The activity worker stays in the Next.js app, but Supabase Cron invokes it every
minute. This avoids Vercel Hobby's daily-only Cron Jobs limit while preserving
the two-minute grace period.

## Deploy and configure

1. Deploy the app after removing the every-minute entry from `web/vercel.json`.
2. In Vercel, add a production environment variable named `CRON_SECRET`. Use a
   random value of at least 16 characters, then redeploy.
3. Run `supabase/027_activity_discord_outbox.sql` and then
   `supabase/028_activity_alert_supabase_cron.sql` in Supabase SQL Editor.
4. In the same SQL Editor, store the production URL and the exact same secret:

```sql
select public.configure_activity_alert_cron(
  'https://YOUR-PRODUCTION-DOMAIN',
  'THE-SAME-LONG-VALUE-AS-VERCEL-CRON_SECRET'
);
```

The values are encrypted by Supabase Vault. The scheduled job safely does
nothing until both secrets exist.

## Verify

Manually invoke the worker once:

```sql
select public.invoke_activity_alert_worker();
```

A numeric request ID means `pg_net` accepted the HTTP request. Inspect the most
recent HTTP responses and cron runs with:

```sql
select id, status_code, error_msg, created
from net._http_response
order by created desc
limit 10;

select status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (
  select jobid from cron.job where jobname = 'minder-activity-alert-worker'
)
order by start_time desc
limit 10;
```

The outbox `send_after` remains the source of truth, so a cron tick before the
two-minute mark claims nothing. A tick after it sends the alert. Deleting the
activity first cascades to the outbox and cancels the pending alert.
