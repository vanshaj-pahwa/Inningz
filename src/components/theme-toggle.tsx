"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Palette, Droplets } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ThemeOption {
  id: string
  name: string
  icon?: React.ReactNode
  colors: {
    bg: string
    card: string
    primary: string
    accent?: string
  }
}

const themes: ThemeOption[] = [
  {
    id: 'light',
    name: 'Light',
    icon: <Sun className="w-3.5 h-3.5" />,
    colors: {
      bg: '#f5f5f6',
      card: '#ffffff',
      primary: '#007AFF',
    }
  },
  {
    id: 'dark',
    name: 'Dark',
    icon: <Moon className="w-3.5 h-3.5" />,
    colors: {
      bg: '#000000',
      card: '#1c1c1e',
      primary: '#007AFF',
    }
  },
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    icon: <Droplets className="w-3.5 h-3.5" />,
    colors: {
      bg: '#0b0e15',
      card: '#aebfe6',
      primary: '#3aa0ff',
      accent: '#8b7bff',
    }
  },
]

function ThemeSwatch({ theme, isActive, onClick }: {
  theme: ThemeOption
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all
        ${isActive
          ? 'bg-primary/10 ring-1 ring-primary/50'
          : 'hover:bg-muted/50'
        }
      `}
    >
      {/* Mini UI preview: background, an accent bar, and a content card */}
      <div
        className="relative w-9 h-9 rounded-lg overflow-hidden ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0"
        style={{ backgroundColor: theme.colors.bg }}
      >
        <div
          className="absolute top-2 left-2 h-1 w-3.5 rounded-full"
          style={{ backgroundColor: theme.colors.primary }}
        />
        <div
          className="absolute inset-x-2 bottom-2 top-4 rounded-md"
          style={{ backgroundColor: theme.colors.card }}
        />
      </div>

      {/* Theme name and icon */}
      <div className="flex flex-col items-start">
        <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
          {theme.name}
        </span>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  )
}

const customThemes = ['midnight', 'pitch', 'sunset', 'sepia', 'liquid-glass']

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    setOpen(false)
  }

  // Get the actual theme being used (resolves 'system' to actual theme)
  const currentTheme = theme === 'system' ? resolvedTheme : theme
  const isCustomTheme = mounted && customThemes.includes(currentTheme || '')
  const isLightTheme = mounted && (currentTheme === 'light' || currentTheme === 'sepia')

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Toggle theme"
          className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-colors text-muted-foreground"
        >
          {/* Light theme icon */}
          <Sun className={`h-4 w-4 transition-all ${
            isLightTheme ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
          }`} />
          {/* Dark/custom theme icon */}
          <Moon className={`absolute h-4 w-4 transition-all ${
            !isLightTheme && !isCustomTheme ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
          }`} />
          {/* Liquid Glass icon */}
          <Droplets className={`absolute h-4 w-4 transition-all ${
            currentTheme === 'liquid-glass' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
          }`} />
          {/* Custom theme icon */}
          <Palette className={`absolute h-4 w-4 transition-all ${
            isCustomTheme && currentTheme !== 'sepia' && currentTheme !== 'liquid-glass' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
          }`} />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2">
        {/* System option */}
        <button
          onClick={() => handleThemeChange("system")}
          className={`
            flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all mb-1
            ${theme === 'system'
              ? 'bg-primary/10 ring-1 ring-primary/50'
              : 'hover:bg-muted/50'
            }
          `}
        >
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center ring-1 ring-black/10 dark:ring-white/10">
            <Monitor className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className={`text-sm font-medium ${theme === 'system' ? 'text-primary' : 'text-foreground'}`}>
            System
          </span>
          {theme === 'system' && (
            <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
          )}
        </button>

        <DropdownMenuSeparator className="my-2" />

        {/* Theme swatches */}
        <div className="space-y-1">
          {mounted && themes.map((t) => (
            <ThemeSwatch
              key={t.id}
              theme={t}
              isActive={currentTheme === t.id}
              onClick={() => handleThemeChange(t.id)}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
