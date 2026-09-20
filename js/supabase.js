// ============================================================
// NOVANEST — Supabase client wrapper
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { NOVANEST_CONFIG } from "./config.js";

const url = NOVANEST_CONFIG.supabaseUrl || "";
const key = NOVANEST_CONFIG.supabaseAnonKey || "";

const looksLikePlaceholder =
  url.includes("YOUR_") ||
  key.includes("YOUR_") ||
  key.includes("PASTE_YOUR") ||
  url === "" ||
  key === "";

if (looksLikePlaceholder) {
  console.error(
    " Supabase config is not set correctly.\n" +
    "   Open js/config.js and replace:\n" +
    "     supabaseUrl     → your Project URL\n" +
    "     supabaseAnonKey → your Publishable (anon) key\n" +
    "   Both are found in Supabase → Settings → API."
  );
}

export const supabase = createClient(url, key);
