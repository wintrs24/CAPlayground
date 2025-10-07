"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Upload, ArrowLeft, ArrowRight } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"

interface SubmitWallpaperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username?: string
  isSignedIn?: boolean
}

type Step = "form" | "preview"

export function SubmitWallpaperDialog({ open, onOpenChange, username = "Anonymous", isSignedIn = false }: SubmitWallpaperDialogProps) {
  const [step, setStep] = useState<Step>("form")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tendiesFile, setTendiesFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  
  const tendiesInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleTendiesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTendiesFile(file)
    }
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      const url = URL.createObjectURL(file)
      setVideoPreviewUrl(url)
    }
  }

  const handleContinue = () => {
    if (!name.trim() || !description.trim() || !tendiesFile || !videoFile) {
      return
    }
    setStep("preview")
  }

  const handleBack = () => {
    setStep("form")
  }

  const handleCancel = () => {
    setStep("form")
    setName("")
    setDescription("")
    setTendiesFile(null)
    setVideoFile(null)
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setVideoPreviewUrl(null)
    onOpenChange(false)
  }

  const handleSubmit = () => {
    // TODO: Implement actual submission logic
    console.log("Submitting wallpaper:", {
      name,
      description,
      tendiesFile,
      videoFile,
      username,
    })
    handleCancel()
  }

  const isFormValid = name.trim() && description.trim() && tendiesFile && videoFile

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!isSignedIn ? (
          <>
            <DialogHeader>
              <DialogTitle>Sign In Required</DialogTitle>
              <DialogDescription>
                You need to be signed in to submit wallpapers
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 text-center space-y-4">
              <p className="text-muted-foreground">
                Please sign in to your account to submit wallpapers to the gallery.
              </p>
              <Link href="/signin">
                <Button className="w-full sm:w-auto">Sign In</Button>
              </Link>
            </div>
          </>
        ) : step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Submit Wallpaper</DialogTitle>
              <DialogDescription>
                Share your wallpaper with the CAPlayground community
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Wallpaper Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Wallpaper Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter wallpaper name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={42}
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/42 characters
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your wallpaper..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={60}
                  className="resize-none whitespace-pre-wrap break-words"
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/60 characters
                </p>
              </div>

              {/* Tendies file upload */}
              <div className="space-y-2">
                <Label htmlFor="tendies-file">.tendies File *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tendies-file"
                    type="file"
                    accept=".tendies"
                    ref={tendiesInputRef}
                    onChange={handleTendiesFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => tendiesInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {tendiesFile ? tendiesFile.name : "Choose .tendies file"}
                  </Button>
                </div>
              </div>

              {/* Video file upload */}
              <div className="space-y-2">
                <Label htmlFor="video-file">Preview Video *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    ref={videoInputRef}
                    onChange={handleVideoFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {videoFile ? videoFile.name : "Choose video file"}
                  </Button>
                </div>
                {videoPreviewUrl && (
                  <div className="mt-2 rounded-md border overflow-hidden">
                    <video
                      src={videoPreviewUrl}
                      className="w-full h-auto max-h-48 object-contain"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </div>
                )}
              </div>

              {/* Author (username) */}
              <div className="space-y-2">
                <Label>Author</Label>
                <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                  {username}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your username will be displayed as the wallpaper creator
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={!isFormValid}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Preview Submission</DialogTitle>
              <DialogDescription>
                This is how your wallpaper will appear in the gallery
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Card className="overflow-hidden">
                <div className="pt-0 px-5">
                  <div className="mb-3 overflow-hidden rounded-md border bg-background">
                    <AspectRatio ratio={1} className="flex items-center justify-center">
                      {videoPreviewUrl && (
                        <video
                          src={videoPreviewUrl}
                          className="w-full h-full object-contain"
                          autoPlay
                          muted
                          loop
                          playsInline
                          aria-label={`${name} preview`}
                        />
                      )}
                    </AspectRatio>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="line-clamp-1">{name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    by {username} (submitted on website)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{description}</p>
                  <div className="flex flex-col gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button className="w-full bg-accent hover:bg-accent/90 text-white" disabled>
                              Download .tendies
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download not available in preview</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit}>
                Submit Wallpaper
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
