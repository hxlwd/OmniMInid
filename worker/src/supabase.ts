import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./http";
import type { Env } from "./types";

export function createSupabaseUserClient(env: Env, bearerToken: string) {
  return createClient(requireEnv(env.SUPABASE_URL, "SUPABASE_URL"), requireEnv(env.SUPABASE_ANON_KEY, "SUPABASE_ANON_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${bearerToken}`
      }
    }
  });
}

export function createSupabaseAdminClient(env: Env) {
  return createClient(
    requireEnv(env.SUPABASE_URL, "SUPABASE_URL"),
    requireEnv(env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}
