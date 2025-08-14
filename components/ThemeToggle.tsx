"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

const THEME_KEY = "abg-theme"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false)

  useEffect(() => {
    if (typeof document === "undefined") return
    const hasDark = document.documentElement.classList.contains("dark")
    setIsDark(hasDark)
  }, [])

  const toggleTheme = useCallback(() => {
    if (typeof document === "undefined") return
    const next = !isDark
    setIsDark(next)
    try {
      if (next) {
        document.documentElement.classList.add("dark")
        localStorage.setItem(THEME_KEY, "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem(THEME_KEY, "light")
      }
    } catch {}
  }, [isDark])

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className="rounded-full"
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}