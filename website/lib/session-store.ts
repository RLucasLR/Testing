import { getDatabase } from './mongodb'

export interface SessionData {
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
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
}

/**
 * Store session data in the court database
 */
export async function storeSession(sessionData: Omit<SessionData, 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    const db = await getDatabase('court')
    const collection = db.collection('sessions')
    
    const sessionToStore: SessionData = {
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Upsert session data (update if exists, insert if not)
    await collection.updateOne(
      { sessionId: sessionData.sessionId },
      { $set: sessionToStore },
      { upsert: true }
    )

    console.log(`Session stored for user ${sessionData.discordId}`)
  } catch (error) {
    console.error('Error storing session:', error)
    // Don't throw error to avoid breaking authentication flow
  }
}

/**
 * Get session data from the court database
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    const db = await getDatabase('court')
    const collection = db.collection('sessions')
    
    const session = await collection.findOne({ sessionId }) as SessionData | null
    
    if (session && session.expiresAt < new Date()) {
      // Session expired, remove it
      await collection.deleteOne({ sessionId })
      return null
    }
    
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Update session data in the court database
 */
export async function updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
  try {
    const db = await getDatabase('court')
    const collection = db.collection('sessions')
    
    await collection.updateOne(
      { sessionId },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    )
  } catch (error) {
    console.error('Error updating session:', error)
  }
}

/**
 * Delete session from the court database
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const db = await getDatabase('court')
    const collection = db.collection('sessions')
    
    await collection.deleteOne({ sessionId })
    console.log(`Session deleted: ${sessionId}`)
  } catch (error) {
    console.error('Error deleting session:', error)
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const db = await getDatabase('court')
    const collection = db.collection('sessions')
    
    const result = await collection.deleteMany({
      expiresAt: { $lt: new Date() }
    })
    
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} expired sessions`)
    }
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error)
  }
} 