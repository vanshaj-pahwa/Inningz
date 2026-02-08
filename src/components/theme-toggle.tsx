"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Palette } from "lucide-react"
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
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bg: '#0e1421',
      card: '#161d2d',
      primary: '#4a90e2',
      accent: '#9b59b6',
    }
  },
  {
    id: 'pitch',
    name: 'Pitch',
    colors: {
      bg: '#0d1a12',
      card: '#132419',
      primary: '#4ade80',
      accent: '#eab308',
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      bg: '#1a100a',
      card: '#241710',
      primary: '#f97316',
      accent: '#ec4899',
    }
  },
  {
    id: 'sepia',
    name: 'Sepia',
    colors: {
      bg: '#f0e6d6',
      card: '#faf6ef',
      primary: '#8b5a2b',
      accent: '#c98b2b',
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
      {/* Theme preview swatch */}
      <div
        className="relative w-10 h-10 rounded-lg overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-sm flex-shrink-0"
        style={{ backgroundColor: theme.colors.bg }}
      >
        {/* Mini card preview */}
        <div
          className="absolute bottom-1 left-1 right-1 h-5 rounded-md"
          style={{ backgroundColor: theme.colors.card }}
        />
        {/* Primary color dot */}
        <div
          className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: theme.colors.primary }}
        />
        {/* Accent color dot (if exists) */}
        {theme.colors.accent && (
          <div
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: theme.colors.accent }}
          />
        )}
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

const customThemes = ['midnight', 'pitch', 'sunset', 'sepia']

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Get the actual theme being used (resolves 'system' to actual theme)
  const currentTheme = theme === 'system' ? resolvedTheme : theme
  const isCustomTheme = mounted && customThemes.includes(currentTheme || '')
  const isLightTheme = mounted && (currentTheme === 'light' || currentTheme === 'sepia')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          {/* Light theme icon */}
          <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${
            isLightTheme ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
          }`} />
          {/* Dark/custom theme icon */}
          <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
            !isLightTheme && !isCustomTheme ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
          }`} />
          {/* Custom theme icon */}
          <Palette className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
            isCustomTheme && currentTheme !== 'sepia' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
          }`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2">
        {/* System option */}
        <button
          onClick={() => setTheme("system")}
          className={`
            flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all mb-1
            ${theme === 'system'
              ? 'bg-primary/10 ring-1 ring-primary/50'
              : 'hover:bg-muted/50'
            }
          `}
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-900 flex items-center justify-center ring-1 ring-black/10 dark:ring-white/10 shadow-sm">
            <Monitor className="w-5 h-5 text-zinc-500" />
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
              onClick={() => setTheme(t.id)}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
