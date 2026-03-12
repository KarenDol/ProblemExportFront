"use client"

import { useState, useEffect } from "react"
import { useStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PLATFORM_CARD_OPTIONS,
  getStoredPlatform,
  setStoredPlatform,
  clearStoredPlatform,
} from "@/lib/platform"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [platform, setPlatform] = useState("")
  const [showLoginForm, setShowLoginForm] = useState(false)

  const login = useStore((s) => s.login)

  useEffect(() => {
    const stored = getStoredPlatform()
    if (stored) {
      setPlatform(stored)
      setShowLoginForm(true)
    }
  }, [])

  const handlePlatformSelect = (value: string) => {
    setStoredPlatform(value)
    setPlatform(value)
    setShowLoginForm(true)
  }

  const handleChangePlatform = () => {
    clearStoredPlatform()
    setPlatform("")
    setShowLoginForm(false)
    setError("")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!username || !password) {
      setError("Username and password are required")
      setLoading(false)
      return
    }

    const success = await login(username, password)
    setLoading(false)

    if (success) {
      router.replace("/")
    } else {
      setError("Invalid credentials")
    }
  }

  const faviconUrl = (domain: string) =>
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

  if (!showLoginForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Problem Upload Manager</CardTitle>
            <p className="text-center text-muted-foreground text-sm mt-2">
              Choose your platform
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-3">
              {PLATFORM_CARD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handlePlatformSelect(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 min-w-[100px] transition-all",
                    "hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    platform === opt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card"
                  )}
                >
                  <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    <img
                      src={faviconUrl(opt.value)}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  </span>
                  <span className="text-center text-sm font-medium leading-tight">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Problem Upload Manager</CardTitle>
          <p className="text-center text-muted-foreground text-sm mt-2">
            Sign in to your account
          </p>
          <p className="text-center text-muted-foreground text-xs mt-1">
            Platform: <span className="font-medium text-foreground">{platform}</span>
            {" · "}
            <button
              type="button"
              onClick={handleChangePlatform}
              className="text-primary hover:underline"
            >
              Change
            </button>
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
