"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useSearchParams } from "next/navigation"
import { Upload } from "lucide-react"
import { SubmitWallpaperDialog } from "./SubmitWallpaperDialog"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface WallpaperItem {
  name: string
  creator: string
  description: string
  file: string
  preview: string
  from: string
}

interface WallpapersResponse {
  base_url: string
  wallpapers: WallpaperItem[]
}

function isVideo(src: string) {
  const lower = src.toLowerCase()
  return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.includes("/video/")
}

export function WallpapersGrid({ data }: { data: WallpapersResponse }) {
  const supabase = getSupabaseBrowserClient()
  const searchParams = useSearchParams()
  const [q, setQ] = useState("")
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [username, setUsername] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>("")
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    const initial = (searchParams?.get("q") || "").trim()
    setQ(initial)
  }, [searchParams])

  useEffect(() => {
    let mounted = true
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser()
        const user = data.user
        if (!user) {
          if (mounted) setIsSignedIn(false)
          return
        }
        
        if (mounted) setIsSignedIn(true)
        
        const meta: any = user.user_metadata || {}
        const name = meta.full_name || meta.name || meta.username || user.email || ""
        if (mounted) setDisplayName(name as string)
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()
        if (mounted && profile?.username) setUsername(profile.username as string)
      } catch {}
    }
    loadUser()
    return () => { mounted = false }
  }, [supabase])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return data.wallpapers
    return data.wallpapers.filter((w) => {
      const name = (w?.name || "").toString().toLowerCase()
      const creator = (w?.creator || "").toString().toLowerCase()
      const desc = (w?.description || "").toString().toLowerCase()
      return name.includes(t) || creator.includes(t) || desc.includes(t)
    })
  }, [q, data.wallpapers])

  return (
    <div className="space-y-6">
      <div className="max-w-xl mx-auto w-full space-y-3">
        <div className="bg-background border rounded-md shadow-sm p-0">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search wallpapers by name, creator, or description..."
          />
        </div>
        <div className="flex justify-center">
          <Button onClick={() => setIsSubmitDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Submit Wallpaper
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:gap-7 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const previewUrl = `${data.base_url}${item.preview}`
          const fileUrl = `${data.base_url}${item.file}`
          return (
            <Card key={`${item.name}-${item.file}`} className="overflow-hidden">
              <div className="pt-0 px-5">
                <div className="mb-3 overflow-hidden rounded-md border bg-background">
                  <AspectRatio ratio={1} className="flex items-center justify-center">
                    {isVideo(previewUrl) ? (
                      <video
                        src={previewUrl}
                        className="w-full h-full object-contain"
                        autoPlay
                        muted
                        loop
                        playsInline
                        aria-label={`${item.name} preview`}
                      />
                    ) : (
                      <img src={previewUrl} alt={`${item.name} preview`} className="w-full h-full object-contain" />
                    )}
                  </AspectRatio>
                </div>
              </div>

              <CardHeader>
                <CardTitle className="line-clamp-1">{item.name}</CardTitle>
                <CardDescription className="line-clamp-2">by {item.creator} (submitted on {item.from})</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{item.description}</p>
                <div className="flex flex-col gap-2">
                  <Link href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-accent hover:bg-accent/90 text-white">Download .tendies</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <SubmitWallpaperDialog
        open={isSubmitDialogOpen}
        onOpenChange={setIsSubmitDialogOpen}
        username={username || displayName || "Anonymous"}
        isSignedIn={isSignedIn}
      />
    </div>
  )
}
