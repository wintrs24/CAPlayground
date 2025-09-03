"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { ArrowLeft, Sun, Moon } from "lucide-react"

export default function PrivacyPage() {
  const { theme, setTheme } = useTheme()
  return (
    <main className="relative min-h-screen px-4 py-10 sm:py-16 bg-gradient-to-b from-muted/40 to-transparent">
      {/* back */}
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

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: 3rd September 2025</p>
        </div>

        {/* Paper container */}
        <div className="rounded-2xl bg-card text-card-foreground shadow-lg ring-1 ring-black/5 border border-border p-6 sm:p-10 text-base sm:text-lg">
          <p className="mt-0 leading-7">
            This Privacy Policy explains how CAPlayground ("we", "us") collects, uses, and protects your information. It
            applies to your use of the CAPlayground website and application (the "Service").
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">1. Information We Collect</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
            <li>
              <strong>Local Projects</strong>: By default, your projects are stored locally on your device (e.g., browser
              localStorage). We do not receive your local projects unless you explicitly upload or share them.
            </li>
            <li>
              <strong>Account Information</strong>: If you create an account via Supabase using email/password or Google OAuth,
              we process your email, necessary authentication identifiers (e.g., provider and user ID), and optional profile
              information required to operate the Service.
            </li>
            <li>
              <strong>Device & Usage</strong>: Basic technical information such as device/browser type and interactions needed to
              operate the Service. We do not run third-party analytics unless stated here.
            </li>
            <li>
              <strong>Cookies & Local Storage</strong>: We use necessary cookies/localStorage for session, preferences, and product
              features (e.g., first-time Terms acceptance: <code>caplayground-tos-accepted</code>).
            </li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">2. How We Use Information</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
            <li>Provide and improve the Service and its features.</li>
            <li>Authenticate users and secure accounts.</li>
            <li>Prevent abuse and ensure the reliability of the Service.</li>
            <li>Communicate important updates related to your account or the Service.</li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">3. Third Parties</h2>
          <p className="mt-6 leading-7">
            We use Supabase for authentication and backend infrastructure. Supabase may process data necessary to provide those
            services and may maintain operational logs (e.g., auth events). Refer to Supabase documentation/policies for more
            details.
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">4. Data Retention</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
            <li>Local projects remain on your device until you remove them.</li>
            <li>Account data is retained while your account is active. If you delete your account, we delete associated account data
              except where retention is required by law.</li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">5. Your Rights</h2>
          <p className="mt-6 leading-7">
            Depending on your location, you may have rights to access, correct, or delete your data. We are planning an account
            deletion endpoint in the app. You can also contact us to exercise your rights.
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">6. Children’s Privacy</h2>
          <p className="mt-6 leading-7">
            The Service is not intended for children under the age specified in our Terms of Service. If you believe a child has
            provided us personal data, contact us and we will take appropriate steps.
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">7. International Transfers</h2>
          <p className="mt-6 leading-7">
            Data may be processed in regions where our providers operate. We take steps to ensure appropriate safeguards consistent
            with applicable laws.
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">8. Changes to This Policy</h2>
          <p className="mt-6 leading-7">
            We may update this Privacy Policy from time to time. We will update the "Last Updated" date above and, when
            appropriate, provide additional notice.
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">9. Contact</h2>
          <p className="mt-6 leading-7">
            Questions? Contact us at <a className="underline" href="mailto:support@enkei64.xyz">support@enkei64.xyz</a>.
          </p>

          <p className="mt-10 text-sm text-muted-foreground">
            See also our {" "}
            <Link href="/tos" className="underline">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </main>
  )
}
