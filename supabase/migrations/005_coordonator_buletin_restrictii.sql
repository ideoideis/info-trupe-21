-- Coordinator now has dietary restrictions + an ID-scan (buletin), mirroring
-- the participant fields. Both are additive and nullable so this is safe to
-- apply to the live table without touching existing rows or current app code.
--   coordonator_restrictii    — free text ("fără" / "vegetarian" / allergies)
--   coordonator_buletin_path  — storage key in the private `trupe-ci` bucket,
--                               e.g. "<trupă>/<nume coordonator>-coord.jpg"
alter table public.trupe_submissions
  add column if not exists coordonator_restrictii text,
  add column if not exists coordonator_buletin_path text;
