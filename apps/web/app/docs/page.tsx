import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "CAPlayground - Documentation",
}

export default function DocsPage() {
  redirect("https://docs.enkei64.xyz")
}
