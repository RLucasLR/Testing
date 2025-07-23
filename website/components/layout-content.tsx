"use client"

import { usePathname } from "next/navigation"
import { Navigation } from "@/components/navigation"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/"
  const isAuthPage = pathname.startsWith("/auth/")

  if (isLoginPage || isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
} 