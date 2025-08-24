import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Send } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-muted/20 to-accent/5 min-h-[calc(100vh-4rem)] flex items-center">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-10 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-24 h-24 bg-accent/30 rounded-full blur-lg animate-pulse delay-1000"></div>
            <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-accent/15 rounded-full blur-2xl animate-pulse delay-2000"></div>
            <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-accent/25 rounded-full blur-xl animate-pulse delay-500"></div>

            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 bg-accent/40 rounded-full animate-ping"></div>
            </div>
            <div className="absolute top-1/4 right-1/4">
              <div className="w-1 h-1 bg-accent/50 rounded-full animate-ping delay-700"></div>
            </div>
            <div className="absolute bottom-1/3 left-1/3">
              <div className="w-1.5 h-1.5 bg-accent/30 rounded-full animate-ping delay-1500"></div>
            </div>
          </div>

          <div className="relative container mx-auto px-4 py-24 md:py-32">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {/* Main Heading */}
              <h1 className="font-heading text-5xl md:text-7xl lg:text-7xl font-bold text-foreground leading-tight">
                <span className="block">The Open Source</span>
                <span className="block text-accent mt-1">CoreAnimation Editor</span>
              </h1>

              {/* Description */}
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer
              </p>

              {/* Button */}
              <div className="pt-8">
                <Link href="#projects">
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <span className="inline-flex items-center gap-2">
                      Try Beta
                      <Send className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
