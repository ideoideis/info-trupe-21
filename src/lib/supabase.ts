import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Submissions will not be persisted."
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const TRUPE_PHOTO_BUCKET = "trupe-photos";

// PRIVATE bucket for ID-card scans (copie CI). Not publicly readable — view via
// signed URLs: supabase.storage.from(TRUPE_CI_BUCKET).createSignedUrl(path, 60)
export const TRUPE_CI_BUCKET = "trupe-ci";
