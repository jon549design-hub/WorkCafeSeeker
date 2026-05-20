"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  // Supabase renamed keys mid-2025. Accept either name so the app works whether
  // env vars came from a fresh Vercel-marketplace install (publishable_key) or
  // a manual setup using the legacy names (anon_key).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, key);
}
