# info trupe — Festivalul ideo ideis

Formular de înscriere a trupelor pentru Festivalul **ideo ideis**: date despre
spectacol, participanți, coordonator și informații pentru contract (persoană
fizică / juridică). Construit cu Vite + React + TypeScript + Tailwind, cu
stocare în Supabase.

## Dezvoltare locală

```bash
npm install
npm run dev      # http://localhost:8080
```

Variabilele de mediu (Supabase) sunt în `.env` (vezi `.env.example`). Cheia
folosită în browser este cea **publishable** (anon); datele sunt protejate prin
Row Level Security.

## Build

```bash
npm run build    # output în dist/
npm run preview  # servește build-ul de producție local
```

## Deploy — GitHub Pages

Deploy automat prin GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
la fiecare push pe `main`. Site-ul live:

**https://ideoideis.github.io/info-trupe-21/**

În producție, `base` este `/info-trupe-21/` (vezi `vite.config.ts`), iar valorile
publice de Supabase sunt în `.env.production`.

## Bază de date (Supabase)

Migrațiile sunt în [`supabase/migrations/`](supabase/migrations) (tabelul
`trupe_submissions`, bucket public `trupe-photos` pentru poze de spectacol și
bucket privat `trupe-ci` pentru documente de identitate).
