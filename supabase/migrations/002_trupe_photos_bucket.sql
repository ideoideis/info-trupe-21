-- Public storage bucket for show photos uploaded via the trupe form
insert into storage.buckets (id, name, public)
values ('trupe-photos', 'trupe-photos', true)
on conflict (id) do nothing;

-- Anon can upload to this bucket
drop policy if exists "Anyone can upload trupe photos" on storage.objects;
create policy "Anyone can upload trupe photos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'trupe-photos');

-- Anyone can read photos (bucket is public)
drop policy if exists "Anyone can read trupe photos" on storage.objects;
create policy "Anyone can read trupe photos"
  on storage.objects for select
  using (bucket_id = 'trupe-photos');
