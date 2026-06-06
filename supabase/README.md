# Supabase — info-trupe-#21

This project uses the **same** Supabase project as `a-moment-of-trust`.

## Apply migrations

Open the Supabase SQL Editor for project
`https://waqyaewaldphstmiobjj.supabase.co` and run, in order:

1. `migrations/001_trupe_submissions.sql` — creates the `trupe_submissions` table + RLS policies.
2. `migrations/002_trupe_photos_bucket.sql` — creates the public `trupe-photos` storage bucket + policies.

Or, with the Supabase CLI linked to the project:

```bash
supabase db push
```

## Environment variables

See `.env.example`. Already wired in `.env` with the publishable anon key.
