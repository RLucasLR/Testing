"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signOut, useSession } from "next-auth/react"
import { AlertTriangle, LogOut, ArrowLeft } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function UnauthorizedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [session, status, router])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleBackToLogin = () => {
    // Always try to sign out first, then redirect to login
    signOut({ callbackUrl: "/" })
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/10 backdrop-blur-lg border-red-500/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Access Denied
            </CardTitle>
            <CardDescription className="text-gray-300">
              You don't have permission to access this system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-100 text-sm leading-relaxed">
                <strong>Required Permissions:</strong>
              </p>
              <ul className="text-red-200 text-xs mt-2 space-y-1">
                <li>• <strong>courtweb.access</strong> - Required for Officer Dashboard</li>
                <li>• <strong>courtweb.staff</strong> - Required for Court Staff Dashboard</li>
              </ul>
              <p className="text-red-200 text-xs mt-2">
                You need the appropriate permission to access the requested section of the Dauphin County Courthouse Case Management System.
              </p>
            </div>

            {session?.user && (
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white text-sm">
                  <strong>Logged in as:</strong> {session.user.name || session.user.email}
                </p>
                {session.user.discordId && (
                  <p className="text-gray-300 text-xs mt-1">
                    Discord ID: {session.user.discordId}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleBackToLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Login
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-400">
                If you believe this is an error, please contact an administrator to request the "court.access" permission.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  )
} 