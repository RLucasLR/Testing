import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifySession } from '@/lib/session-verifier'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - No session found' }, { status: 401 })
    }

    // Verify session server-side (this prevents client manipulation)
    const verification = await verifySession(session.user.id)
    
    if (!verification.isValid) {
      return NextResponse.json({ 
        error: 'Invalid session', 
        details: verification.error 
      }, { status: 401 })
    }

    // Check permissions with PennStateRP API (real-time verification)
    const response = await fetch(`https://api.pennstaterp.com/permissions/${verification.session!.discordId}`, {
      headers: {
        'api-key': process.env.PENNAPI_KEY || '',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Permission check failed: ${response.status} ${response.statusText}` }, 
        { status: response.status }
      )
    }

    const permissions = await response.json()
    const hasCourtAccess = permissions.matchedPermIDs?.includes('courtweb.access') || false
    const hasCourtStaffAccess = permissions.matchedPermIDs?.includes('courtweb.staff') || false

    return NextResponse.json({
      discordId: verification.session!.discordId,
      permissions,
      hasCourtAccess,
      hasCourtStaffAccess,
      verifiedSession: {
        hasCourtAccess: verification.session!.hasCourtAccess,
        hasCourtStaffAccess: verification.session!.hasCourtStaffAccess,
        permissions: verification.session!.permissions
      },
      serverVerified: true
    })
  } catch (error) {
    console.error('Error checking permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { discordId } = await request.json()
    
    if (!discordId) {
      return NextResponse.json({ error: 'Discord ID is required' }, { status: 400 })
    }

    // Check permissions with PennStateRP API
    const response = await fetch(`https://api.pennstaterp.com/permissions/${discordId}`, {
      headers: {
        'api-key': process.env.PENNAPI_KEY || '',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Permission check failed: ${response.status} ${response.statusText}` }, 
        { status: response.status }
      )
    }

    const permissions = await response.json()
    const hasCourtAccess = permissions.matchedPermIDs?.includes('courtweb.access') || false
    const hasCourtStaffAccess = permissions.matchedPermIDs?.includes('courtweb.staff') || false

    return NextResponse.json({
      discordId,
      permissions,
      hasCourtAccess,
      hasCourtStaffAccess
    })
  } catch (error) {
    console.error('Error checking permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 