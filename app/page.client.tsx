"use client"

import { useStore } from "@/lib/store"
import LoginPage from "@/components/login-page"
import DashboardPage from "@/components/dashboard-page"

export default function HomeClient() {
  const { isLoggedIn } = useStore()

  if (!isLoggedIn) return <LoginPage />

  return <DashboardPage />
}
