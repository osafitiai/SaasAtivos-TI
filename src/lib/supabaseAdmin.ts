import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente administrativo do Supabase (server-side). Usa a chave secreta/service_role,
// que ignora RLS — deve ser usada APENAS no backend, nunca exposta ao navegador.
const globalForSupabase = globalThis as unknown as { supabaseAdmin?: SupabaseClient };

function resolveUrl(): string {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.replace(/\/$/, "");
}

function resolveKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  );
}

export function getSupabaseAdmin(): SupabaseClient {
  if (globalForSupabase.supabaseAdmin) return globalForSupabase.supabaseAdmin;

  const url = resolveUrl();
  const key = resolveKey();
  if (!url || !key) {
    throw new Error(
      "Supabase Storage não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente."
    );
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  globalForSupabase.supabaseAdmin = client;
  return client;
}

export const DOCUMENTS_BUCKET = process.env.SUPABASE_BUCKET || "documents";
