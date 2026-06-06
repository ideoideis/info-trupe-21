-- PRIVATE storage bucket for ID-card scans (copie CI) from the trupe form.
-- Unlike `trupe-photos` (public), this bucket is private: the public form may
-- upload, but the files are NOT publicly readable. Reads require auth and are
-- served through short-lived signed URLs (createSignedUrl).
insert into storage.buckets (id, name, public)
values ('trupe-ci', 'trupe-ci', false)
on conflict (id) do nothing;

-- Anon (public form) + authenticated may upload ID scans
drop policy if exists "Anyone can upload trupe CI" on storage.objects;
create policy "Anyone can upload trupe CI"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'trupe-ci');

-- Only authenticated users may read ID scans (via signed URLs). Anon cannot.
drop policy if exists "Authenticated can read trupe CI" on storage.objects;
create policy "Authenticated can read trupe CI"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'trupe-ci');
