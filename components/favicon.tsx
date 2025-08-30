"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

function upsertLink(rel: string, href: string, media?: string) {
  const selector = `link[rel="${rel}"]${media ? `[media="${media}"]` : ''}`
  let link = document.head.querySelector<HTMLLinkElement>(selector)
  if (!link) {
    link = document.createElement("link")
    link.rel = rel
    if (media) link.media = media
    document.head.appendChild(link)
  }
  link.href = href
}

export function Favicon() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    const injected = (globalThis as any).__NEXT_DATA__?.assetPrefix as string | undefined;
    const base = (injected || process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
    const icon = `${base}${isDark ? "/icon-dark.png" : "/icon-light.png"}`;

    upsertLink("icon", icon);
    upsertLink("shortcut icon", icon);

    upsertLink("apple-touch-icon", icon);
  }, [resolvedTheme])

  return null
}
