"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { AspectRatio } from "@/components/ui/aspect-ratio"

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
  const [q, setQ] = useState("")

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
      <div className="max-w-xl mx-auto w-full">
        <div className="bg-background border rounded-md shadow-sm p-0">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search wallpapers by name, creator, or description..."
          />
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
    </div>
  )
}
