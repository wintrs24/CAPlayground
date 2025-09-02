"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { AtSign, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

export default function ForgotPasswordPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Theme toggle (top-right) */}
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
            <CardTitle className="text-3xl md:text-4xl font-bold">Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" className="pl-9" />
                </div>
              </div>

              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                Send reset link
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Remembered your password?{" "}
                <Link href="/signin" className="text-accent hover:underline font-medium">
                  Back to sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
