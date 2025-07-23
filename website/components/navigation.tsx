"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    try {
      // Clean up session in database
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch (error) {
      console.error('Error cleaning up session:', error)
    }
    
    // Sign out from NextAuth
    signOut({ callbackUrl: "/" })
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <img src="/dauphin_county.png" alt="Dauphin County Logo" className="h-10 w-auto" />
            <h1 className="text-xl font-bold text-gray-900">Dauphin County Courthouse</h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Navigation Links */}
            <div className="flex space-x-1">
              <Link
                href="/officer"
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                  pathname === "/officer"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                )}
              >
                Officer Dashboard
              </Link>
              {session?.user?.hasCourtStaffAccess && (
                <Link
                  href="/court-staff"
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                    pathname === "/court-staff"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                  )}
                >
                  Court Staff Dashboard
                </Link>
              )}
            </div>

            {/* User Info and Logout */}
            {session?.user && (
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {session.user.image ? (
                      <img 
                        src={session.user.image} 
                        alt="User Avatar" 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {session.user.name || session.user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Authenticated
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 hover:text-red-600 hover:border-red-300"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
