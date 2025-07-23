import { getSession } from './session-store'

export interface VerifiedSession {
  isValid: boolean
  session?: {
    sessionId: string
    discordId: string
    userId: string
    userName?: string
    userEmail?: string
    userImage?: string
    hasCourtAccess: boolean
    hasCourtStaffAccess: boolean
    permissions?: {
      userID: string
      matchedPermIDs: string[]
      matchedRoles: string[]
    }
  }
  error?: string
}

/**
 * Verify session and permissions server-side
 * This function validates the session exists and has not expired
 */
export async function verifySession(sessionId: string): Promise<VerifiedSession> {
  try {
    const session = await getSession(sessionId)
    
    if (!session) {
      return {
        isValid: false,
        error: 'Session not found or expired'
      }
    }

    return {
      isValid: true,
      session: {
        sessionId: session.sessionId,
        discordId: session.discordId,
        userId: session.userId,
        userName: session.userName,
        userEmail: session.userEmail,
        userImage: session.userImage,
        hasCourtAccess: session.hasCourtAccess,
        hasCourtStaffAccess: session.hasCourtStaffAccess,
        permissions: session.permissions
      }
    }
  } catch (error) {
    console.error('Error verifying session:', error)
    return {
      isValid: false,
      error: 'Session verification failed'
    }
  }
}

/**
 * Verify user has specific permission
 */
export async function verifyPermission(sessionId: string, requiredPermission: 'courtweb.access' | 'courtweb.staff'): Promise<VerifiedSession> {
  const verification = await verifySession(sessionId)
  
  if (!verification.isValid || !verification.session) {
    return verification
  }

  const hasPermission = requiredPermission === 'courtweb.access' 
    ? verification.session.hasCourtAccess 
    : verification.session.hasCourtStaffAccess

  if (!hasPermission) {
    return {
      isValid: false,
      error: `Missing required permission: ${requiredPermission}`
    }
  }

  return verification
}

/**
 * Verify user has access to specific route
 */
export async function verifyRouteAccess(sessionId: string, route: '/officer' | '/court-staff'): Promise<VerifiedSession> {
  const requiredPermission = route === '/officer' ? 'courtweb.access' : 'courtweb.staff'
  return await verifyPermission(sessionId, requiredPermission)
}

/**
 * Get user permissions from verified session
 */
export async function getUserPermissions(sessionId: string): Promise<{
  hasCourtAccess: boolean
  hasCourtStaffAccess: boolean
  permissions?: {
    userID: string
    matchedPermIDs: string[]
    matchedRoles: string[]
  }
} | null> {
  const verification = await verifySession(sessionId)
  
  if (!verification.isValid || !verification.session) {
    return null
  }

  return {
    hasCourtAccess: verification.session.hasCourtAccess,
    hasCourtStaffAccess: verification.session.hasCourtStaffAccess,
    permissions: verification.session.permissions
  }
} 