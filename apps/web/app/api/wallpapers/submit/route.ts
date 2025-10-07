import { NextRequest, NextResponse } from "next/server"

/**
Put DISCORD_WALLPAPER_WEBHOOK_URL in .env.local
 */
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WALLPAPER_WEBHOOK_URL

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Authentication not configured" }, { status: 500 })
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseAnonKey,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await userResponse.json()

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=username`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseAnonKey,
      },
    })

    let username = "Anonymous"
    if (profileResponse.ok) {
      const profiles = await profileResponse.json()
      username = profiles[0]?.username || user.user_metadata?.name || user.email || "Anonymous"
    } else {
      username = user.user_metadata?.name || user.email || "Anonymous"
    }

    const formData = await request.formData()
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const tendiesFile = formData.get("tendiesFile") as File
    const videoFile = formData.get("videoFile") as File

    if (!name || !description || !tendiesFile || !videoFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!tendiesFile.name.endsWith(".tendies")) {
      return NextResponse.json({ error: "Wallpaper must be a .tendies file" }, { status: 400 })
    }

    const videoExtension = videoFile.name.split(".").pop()?.toLowerCase()
    if (videoExtension !== "mp4" && videoExtension !== "mov") {
      return NextResponse.json({ error: "Preview must be a .mp4 or .mov file" }, { status: 400 })
    }

    if (name.length > 42) {
      return NextResponse.json({ error: "Name must be 42 characters or less" }, { status: 400 })
    }
    if (description.length > 60) {
      return NextResponse.json({ error: "Description must be 60 characters or less" }, { status: 400 })
    }

    if (!DISCORD_WEBHOOK_URL) {
      console.error("DISCORD_WALLPAPER_WEBHOOK_URL not configured")
      return NextResponse.json({ error: "Submission service not configured" }, { status: 500 })
    }

    const tendiesBuffer = Buffer.from(await tendiesFile.arrayBuffer())
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())

    const embed = {
      title: `Wallpaper Submission: ${name}`,
      fields: [
        { name: "Description", value: description },
        { name: "Creator", value: username },
        { name: "Source", value: "Website" },
      ],
      color: 0x3b82f6,
      timestamp: new Date().toISOString(),
    }

    const discordFormData = new FormData()
    discordFormData.append("payload_json", JSON.stringify({ embeds: [embed] }))
    discordFormData.append("files[0]", new Blob([tendiesBuffer]), tendiesFile.name)
    discordFormData.append("files[1]", new Blob([videoBuffer]), videoFile.name)

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      body: discordFormData,
    })

    if (!discordResponse.ok) {
      console.error("Discord webhook failed:", await discordResponse.text())
      return NextResponse.json({ error: "Failed to submit to review" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Submission sent for review!" })
  } catch (error) {
    console.error("Submission error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
