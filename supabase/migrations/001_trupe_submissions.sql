-- trupe_submissions: form responses from the "info trupe #21" page
create table if not exists public.trupe_submissions (
  id uuid primary key default gen_random_uuid(),

  -- despre spectacol
  trupa text not null,
  nume_spectacol text not null,
  dramaturg text not null,
  echipa_creativa text not null,        -- "regizor, scenograf, coregraf, coloana sonora etc."
  distributie text not null,
  despre_spectacol text not null,
  necesar_tehnic text not null,
  photo_url text,                       -- public URL of uploaded photo

  -- despre participanți
  nr_participanti int not null,
  participanti jsonb not null default '[]'::jsonb,  -- [{ nume, info }, ...]

  -- despre coordonator
  coordonator_nume text not null,
  coordonator_varsta text not null,
  coordonator_tricou text not null,
  coordonator_email text not null,
  coordonator_telefon text not null,

  -- pentru contract
  persoana_tip text not null,           -- "fizica" | "juridica"
  acord_termeni boolean not null default false,

  created_at timestamptz not null default now()
);

-- RLS
alter table public.trupe_submissions enable row level security;

-- Anyone can insert (public form)
drop policy if exists "Anyone can insert trupe submissions" on public.trupe_submissions;
create policy "Anyone can insert trupe submissions"
  on public.trupe_submissions for insert
  with check (true);

-- Only authenticated users can read (admin dashboard, etc.)
drop policy if exists "Authenticated can read trupe submissions" on public.trupe_submissions;
create policy "Authenticated can read trupe submissions"
  on public.trupe_submissions for select
  using (auth.role() = 'authenticated');
