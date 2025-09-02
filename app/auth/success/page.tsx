"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function AuthSuccessPage() {
  const supabase = getSupabaseBrowserClient()
  const [status, setStatus] = useState<"checking" | "signed_in" | "not_signed_in">("checking")

  useEffect(() => {
    let mounted = true
    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setStatus(data.session ? "signed_in" : "not_signed_in")
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
      <Card className="border-border/80 shadow-none w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{status === "signed_in" ? "You're signed in" : "Sign-in failed or expired"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "signed_in" ? (
            <>
              <p className="text-sm text-muted-foreground">You're good to go.</p>
              <Button onClick={() => (window.location.href = "/")}>Continue</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Please try again.</p>
              <Button variant="outline" onClick={() => (window.location.href = "/signin")}>Back to sign in</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
