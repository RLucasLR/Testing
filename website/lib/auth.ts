import { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient } from "mongodb"
import { storeSession, deleteSession } from "./session-store"

// Interface for the PennStateRP API response
interface PermissionResponse {
  userID: string
  matchedPermIDs: string[]
  matchedRoles: string[]
}

// Function to check user permissions
async function checkUserPermissions(discordUserId: string): Promise<PermissionResponse | null> {
  try {
    const response = await fetch(`https://api.pennstaterp.com/permissions/${discordUserId}`, {
      headers: {
        'api-key': process.env.PENNAPI_KEY || '',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`Permission check failed: ${response.status} ${response.statusText}`)
      return null
    }

    const data: PermissionResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error checking user permissions:', error)
    return null
  }
}

// Create MongoDB client for NextAuth
const clientPromise = process.env.MONGODB_URI 
  ? new MongoClient(process.env.MONGODB_URI).connect()
  : Promise.resolve(null)

export const authOptions: NextAuthOptions = {
  adapter: process.env.MONGODB_URI ? MongoDBAdapter(clientPromise as Promise<MongoClient>) : undefined,
  providers: process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET ? [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "identify"
        }
      }
    })
  ] : [],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && user.id) {
        try {
          // Check user permissions with PennStateRP API
          const permissions = await checkUserPermissions(user.id)
          
          if (!permissions) {
            console.error('Failed to fetch user permissions')
            return false
          }

          // Check if user has courtweb.access permission
          const hasCourtAccess = permissions.matchedPermIDs.includes('courtweb.access')
          const hasCourtStaffAccess = permissions.matchedPermIDs.includes('courtweb.staff')
          
          if (!hasCourtAccess) {
            console.log(`User ${user.id} denied access - missing courtweb.access permission`)
            // Store the denial reason in the user object for later use
            user.accessDenied = true
            user.permissionError = 'You do not have the required "courtweb.access" permission to access this system.'
            return false
          }

          // Store permission data in user object for session
          user.permissions = permissions
          user.hasCourtAccess = hasCourtAccess
          user.hasCourtStaffAccess = hasCourtStaffAccess
          return true
        } catch (error) {
          console.error('Error during sign in permission check:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Persist user permissions in the token
      if (user?.permissions) {
        token.permissions = user.permissions
        token.hasCourtAccess = user.hasCourtAccess
        token.hasCourtStaffAccess = user.hasCourtStaffAccess
      }
      
      if (user?.accessDenied) {
        token.accessDenied = true
        token.permissionError = user.permissionError
      }

      // Store Discord user ID for future permission checks
      if (account?.providerAccountId) {
        token.discordId = account.providerAccountId
      }

      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.permissions) {
        session.user.permissions = token.permissions
        session.user.hasCourtAccess = token.hasCourtAccess
        session.user.hasCourtStaffAccess = token.hasCourtStaffAccess
      }
      
      if (token.discordId) {
        session.user.discordId = token.discordId
      }

      if (token.accessDenied) {
        session.user.accessDenied = token.accessDenied
        session.user.permissionError = token.permissionError
      }

      // Store session data in court database for API access
      if (session.user.id && token.discordId && token.permissions) {
        const sessionData = {
          sessionId: session.user.id,
          discordId: token.discordId,
          userId: session.user.id,
          userName: session.user.name || undefined,
          userEmail: session.user.email || undefined,
          userImage: session.user.image || undefined,
          hasCourtAccess: token.hasCourtAccess || false,
          hasCourtStaffAccess: token.hasCourtStaffAccess || false,
          permissions: token.permissions,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
        
        await storeSession(sessionData)
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      // Redirect to officer dashboard after successful login
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/officer`
    }
  },
  pages: {
    signIn: '/',
    error: '/auth/error'
  },
  session: {
    strategy: "jwt"
  },
  debug: process.env.NODE_ENV === 'development'
}

// Type extensions for NextAuth
declare module "next-auth" {
  interface User {
    permissions?: PermissionResponse
    accessDenied?: boolean
    permissionError?: string
    hasCourtAccess?: boolean
    hasCourtStaffAccess?: boolean
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      discordId?: string
      permissions?: PermissionResponse
      hasCourtAccess?: boolean
      hasCourtStaffAccess?: boolean
      accessDenied?: boolean
      permissionError?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string
    permissions?: PermissionResponse
    hasCourtAccess?: boolean
    hasCourtStaffAccess?: boolean
    accessDenied?: boolean
    permissionError?: string
  }
} 