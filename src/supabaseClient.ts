import { createClient } from "@supabase/supabase-js";

const defaultSupabaseUrl = "https://dlehdgvheztziiwurdtl.supabase.co";
const defaultSupabaseAnonKey = "sb_publishable_Sl3ZH6H1K58tX2Ei_BRwVQ_MoKw_y8r";

function readConfigValue(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.includes("your_supabase")) return fallback;
  return raw;
}

const supabaseUrl = readConfigValue(
  import.meta.env.VITE_SUPABASE_URL,
  defaultSupabaseUrl,
);
const supabaseAnonKey = readConfigValue(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  defaultSupabaseAnonKey,
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
