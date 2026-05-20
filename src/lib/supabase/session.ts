"use client";

import { createSupabaseBrowserClient } from "./client";

// Ensures the current browser has a Supabase session.
// For MVP we use anonymous sign-in so the data model is per-user from day one.
// Swap this for real auth (email / OAuth) when going public — schema doesn't change.
export async function ensureSession() {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signIn.session;
}
