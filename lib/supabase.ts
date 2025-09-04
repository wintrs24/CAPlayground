import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient | undefined

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {

    const disabled: any = {
      _disabled: true,
      auth: {
        async getSession() {
          return { data: { session: null }, error: null }
        },
        onAuthStateChange(_cb: any) {
          return { data: { subscription: { unsubscribe() {} } } }
        },
        async signInWithPassword() {
          return { data: null, error: new Error("Authentication is disabled in this environment.") }
        },
        async signUp() {
          return { data: null, error: new Error("Authentication is disabled in this environment.") }
        },
        async signOut() {
          return { error: null }
        },
        async signInWithOAuth() {
          return { data: null, error: new Error("Authentication is disabled in this environment.") }
        },
        async getUser() {
          return { data: { user: null }, error: null }
        },
      },
    }
    browserClient = disabled as SupabaseClient
    return browserClient
  }
  browserClient = createClient(url, anon)
  return browserClient
}

let adminClient: SupabaseClient | undefined
export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) throw new Error("Account admin features disabled. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  if (!adminClient) {
    adminClient = createClient(url, service, { auth: { persistSession: false } })
  }
  return adminClient
}

export function getSupabaseServerClientWithAuth(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error("Server auth disabled. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
}

export const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

