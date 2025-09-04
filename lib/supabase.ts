// import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// let browserClient: SupabaseClient | undefined

// export function getSupabaseBrowserClient(): SupabaseClient {
//   if (browserClient) return browserClient
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL
//   const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
//   if (!url || !anon) {
//     throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
//   }
//   browserClient = createClient(url, anon)
//   return browserClient
// }

// let adminClient: SupabaseClient | undefined
// export function getSupabaseAdminClient(): SupabaseClient {
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL
//   const service = process.env.SUPABASE_SERVICE_ROLE_KEY
//   if (!url || !service) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
//   if (!adminClient) {
//     adminClient = createClient(url, service, { auth: { persistSession: false } })
//   }
//   return adminClient
// }

// export function getSupabaseServerClientWithAuth(token: string): SupabaseClient {
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL
//   const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
//   if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
//   return createClient(url, anon, {
//     global: { headers: { Authorization: `Bearer ${token}` } },
//     auth: { persistSession: false },
//   })
// }
