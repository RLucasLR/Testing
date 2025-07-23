"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { useEffect } from "react"

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Redirect to officer dashboard if already authenticated
    if (status === "authenticated" && session?.user?.hasCourtAccess) {
      router.push("/officer")
    }
  }, [session, status, router])

  const handleDiscordLogin = () => {
    signIn("discord", { callbackUrl: "/officer" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-300">
              Sign in with your Discord account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleDiscordLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Continue with Discord
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-gray-400">
                By continuing, you agree to our{" "}
                <a href="#" className="text-indigo-400 hover:text-indigo-300 underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-indigo-400 hover:text-indigo-300 underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  )
}
