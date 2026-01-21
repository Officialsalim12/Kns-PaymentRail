# Check Member Suspensions Edge Function

This edge function automatically suspends members who haven't paid their dues after a 3-month grace period.

## Setup

1. Deploy this function to Supabase:
   ```bash
   supabase functions deploy check-member-suspensions
   ```

2. Set up a cron job to run this daily:
   - Go to Supabase Dashboard → Database → Cron Jobs
   - Create a new cron job:
     - Name: `check_member_suspensions`
     - Schedule: `0 0 * * *` (runs daily at midnight)
     - SQL:
       ```sql
       SELECT net.http_post(
         url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-member-suspensions',
         headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
       );
       ```

## What it does

1. Finds all members whose grace period has ended
2. Checks if they have made any payments
3. Suspends members who haven't paid
4. Creates dashboard notifications
5. Logs email/SMS notifications (you can integrate actual services)

## Manual Trigger

You can also trigger this manually:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-member-suspensions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

