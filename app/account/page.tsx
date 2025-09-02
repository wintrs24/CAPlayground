"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function AccountPage() {
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      const u = data.user
      if (!u) {
        window.location.href = "/signin"
        return
      }
      setUserId(u.id)
      setEmail(u.email ?? "")
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", u.id)
          .maybeSingle()
        if (profile?.username) setUsername(profile.username)
      } catch {}
      setLoading(false)
    }
    load()
  }, [supabase])

  async function saveUsername() {
    if (!userId) return
    setMessage(null)
    setError(null)
    try {
      const { error } = await supabase.from("profiles").upsert({ id: userId, username })
      if (error) throw error
      setMessage("Username saved")
    } catch (e: any) {
      setError(e.message ?? "Failed to save username. Ensure a 'profiles' table exists with columns: id uuid primary key, username text.")
    }
  }

  async function changePassword() {
    setMessage(null)
    setError(null)
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setMessage("Password updated")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e: any) {
      setError(e.message ?? "Failed to update password")
    }
  }

  async function sendResetEmail() {
    setMessage(null)
    setError(null)
    try {
      const origin = window.location.origin
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })
      if (error) throw error
      setMessage("Reset email sent (if the email exists)")
    } catch (e: any) {
      setError(e.message ?? "Failed to send reset email")
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  async function deleteAccount() {
    if (!userId) return
    const confirmed = window.confirm("This will delete your account permanently. Continue?")
    if (!confirmed) return
    setMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Delete failed with status ${res.status}`)
      }
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (e: any) {
      setError(e.message ?? "Failed to delete account (ensure server is configured with SUPABASE_SERVICE_ROLE_KEY)")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6">
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={email} readOnly className="mt-1" />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="Pick a username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" />
              <div className="mt-2">
                <Button onClick={saveUsername}>Save username</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button onClick={changePassword}>Update password</Button>
              <Button variant="outline" onClick={sendResetEmail}>Send reset email</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={signOut}>Sign out</Button>
          <Button variant="destructive" onClick={deleteAccount}>Delete account</Button>
        </div>
      </div>
    </div>
  )
}
