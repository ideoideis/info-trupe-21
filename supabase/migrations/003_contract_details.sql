-- Conditional "pentru contract" fields. The shape depends on persoana_tip:
--   fizica:   { nume_complet, adresa, cnp, copie_ci_url, telefon, email, cont_bancar, banca }
--   juridica: { nume_persoana_juridica, sediu_social, cui, nr_registrul_comertului,
--               cont_bancar, banca, reprezentant }
alter table public.trupe_submissions
  add column if not exists contract_details jsonb not null default '{}'::jsonb;
