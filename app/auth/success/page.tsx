"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

function isValidUsername(u: string) {
  return /^[A-Za-z0-9!._-]{3,20}$/.test(u)
}

export default function AuthSuccessPage() {
  const supabase = getSupabaseBrowserClient()
  const [status, setStatus] = useState<"checking" | "need_username" | "ready" | "not_signed_in">("checking")
  const [username, setUsername] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function check() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      const user = data.user
      if (!user) {
        setStatus("not_signed_in")
        return
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()
        if (profile?.username) {
          setStatus("ready")
        } else {
          setStatus("need_username")
        }
      } catch {
        setStatus("ready")
      }
    }
    check()
  }, [supabase])

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="border-border/80 shadow-none w-full max-w-md">
          <CardHeader>
            <CardTitle>Completing sign-in…</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying session
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="border-border/80 shadow-none w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {status === "need_username" ? "Choose a username" : status === "ready" ? "You're signed in" : "Sign-in failed or expired"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "need_username" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Pick a username" className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">3–20 chars. Letters, numbers, and ! - _ . only.</p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 justify-center">
                <Button
                  disabled={saving}
                  onClick={async () => {
                    setError(null)
                    if (!isValidUsername(username)) {
                      setError("Username must be 3-20 chars and only letters, numbers, and ! - _ .")
                      return
                    }
                    setSaving(true)
                    try {
                      const { data: userRes } = await supabase.auth.getUser()
                      const uid = userRes.user?.id
                      if (!uid) throw new Error("No user session")
                      const { error } = await supabase.from("profiles").upsert({ id: uid, username })
                      if (error) throw error
                      setStatus("ready")
                    } catch (e: any) {
                      setError(e.message ?? "Failed to save username")
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  {saving ? "Saving…" : "Save username"}
                </Button>
              </div>
            </div>
          ) : status === "ready" ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">You're good to go.</p>
              <Button onClick={() => (window.location.href = "/")}>Continue</Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Please try again.</p>
              <Button variant="outline" onClick={() => (window.location.href = "/signin")}>Back to sign in</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
