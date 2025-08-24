import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, FileText, Code, Zap } from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Coming Soon Badge */}
            <div className="flex justify-center">
              <Badge
                variant="secondary"
                className="bg-accent/10 text-accent border-accent/20 px-4 py-2 text-sm font-medium"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Coming Soon
              </Badge>
            </div>

            {/* Title */}
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">Documentation</h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Comprehensive guides, tutorials, and API references for CAPlayground are being prepared. Check back soon
              for detailed documentation on creating stunning animated wallpapers.
            </p>

            {/* CTA */}
            <div className="pt-12">
              <p className="text-muted-foreground mb-6">Want to be notified when documentation is available? (You can't)</p>
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
                >
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
