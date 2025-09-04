"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AtSign, Lock, User as UserIcon, ArrowLeft, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { AUTH_ENABLED, getSupabaseBrowserClient } from "@/lib/supabase"

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const { theme, setTheme } = useTheme()

  const [emailOrUsername, setEmailOrUsername] = useState("")
  const [email, setEmail] = useState("")
  const [signupUsername, setSignupUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes("access_token") || hash.includes("code")) {
      supabase.auth.getSession().then(() => {
      })
    }
  }, [supabase])

  if (!AUTH_ENABLED) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative">
        {/* back*/}
        <div className="absolute left-4 top-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
        </div>

        {/* theme */}
        <div className="absolute right-4 top-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="rounded-full h-9 w-9 p-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        <div className="w-full max-w-md">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl font-bold">Sign in disabled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Authentication is disabled in this environment because required environment variables are not set.
                </p>
                <p className="text-sm text-muted-foreground">
                  The rest of the site still works. To enable accounts, set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                </p>
                <div className="flex gap-3">
                  <Link href="/">
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">Go to Home</Button>
                  </Link>
                  <Link href="/docs">
                    <Button variant="outline">Docs</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  async function handleSignIn() {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      })
      if (error) throw error
      window.location.href = "/"
    } catch (e: any) {
      setError(e.message ?? "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  function isValidUsername(u: string) {
    // 3-20 chars, A-Z a-z 0-9 and ! - _ .
    return /^[A-Za-z0-9!._-]{3,20}$/.test(u)
  }

  async function handleSignUp() {
    setError(null)
    setLoading(true)
    try {
      if (!isValidUsername(signupUsername)) {
        throw new Error("Username must be 3-20 chars and only letters, numbers, and ! - _ .")
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: signupUsername },
        },
      })
      if (error) throw error
      alert("Check your email for a confirmation link.")
      setMode("signin")
    } catch (e: any) {
      setError(e.message ?? "Failed to sign up")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setLoading(true)
    try {
      const origin = window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/success` },
      })
      if (error) throw error
    } catch (e: any) {
      setError(e.message ?? "Google sign-in failed")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* back*/}
      <div className="absolute left-4 top-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
      </div>

      {/* theme */}
      <div className="absolute right-4 top-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="rounded-full h-9 w-9 p-0"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl md:text-4xl font-bold">
              {mode === "signin" ? "Welcome Back" : "Create an Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "signin" ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-identifier">Email</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="signin-identifier" type="email" placeholder="Your Email" className="pl-9" value={emailOrUsername} onChange={(e) => setEmailOrUsername(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="signin-password" type="password" placeholder="Your Password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="text-right text-sm">
                    <Link href="/forgot-password" className="text-accent hover:underline">Forgot password?</Link>
                  </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button disabled={loading} onClick={handleSignIn} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">{loading ? "Signing In..." : "Sign In"}</Button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGoogle} disabled={loading}>
                  <GoogleColorIcon className="h-4 w-4" />
                  Continue with Google
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  New here?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-accent hover:underline font-medium"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="Choose a username"
                      className="pl-9"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">3–20 chars. Letters, numbers, and ! - _ . only.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="Your Email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-password" type="password" placeholder="Create a Password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                <p className="text-xs text-muted-foreground">
                  By signing up, you agree to our {" "}
                  <Link href="/tos" className="underline">Terms of Service</Link> and {" "}
                  <Link href="/privacy" className="underline">Privacy Policy</Link>. You must be at least 13 years old, or the
                  minimum age of digital consent in your country.
                </p>
                <Button disabled={loading} onClick={handleSignUp} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">{loading ? "Signing Up..." : "Sign Up"}</Button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGoogle} disabled={loading}>
                  <GoogleColorIcon className="h-4 w-4" />
                  Sign up with Google
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("signin")}
                    className="text-accent hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GoogleColorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  )
}
