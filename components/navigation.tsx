"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const nav = document.getElementById("mobile-nav")
      const button = document.getElementById("mobile-menu-button")

      if (
        isMenuOpen &&
        nav &&
        button &&
        !nav.contains(event.target as Node) &&
        !button.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and App Name */}
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <div className="h-4 w-4 rounded bg-accent-foreground"></div>
            </div>
            <Link
              href="/"
              className="font-heading text-xl font-bold text-foreground hover:text-accent transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              CAPlayground
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/docs" className="text-foreground hover:text-accent transition-colors">
              Docs
            </Link>
            <Link href="/contributors" className="text-foreground hover:text-accent transition-colors">
              Contributors
            </Link>
            <Link href="/projects">
              <Button variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                Projects
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="mobile-menu-button"
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          id="mobile-nav"
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-4 border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col space-y-1">
              <Link
                href="/docs"
                className="text-foreground hover:text-accent hover:bg-muted/50 transition-all duration-200 py-3 px-4 rounded-lg mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Docs
              </Link>
              <Link
                href="/contributors"
                className="text-foreground hover:text-accent hover:bg-muted/50 transition-all duration-200 py-3 px-4 rounded-lg mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Contributors
              </Link>
              <div className="px-2 pt-2">
                <Link href="/projects" onClick={() => setIsMenuOpen(false)}>
                  <Button
                    variant="default"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold w-full"
                  >
                    Projects
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
