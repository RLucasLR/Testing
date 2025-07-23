import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyPermission, verifyRouteAccess } from '@/lib/session-verifier'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Method 1: Verify specific permission
    const permissionVerification = await verifyPermission(session.user.id, 'courtweb.access')
    
    if (!permissionVerification.isValid) {
      return NextResponse.json({ 
        error: 'Access denied', 
        details: permissionVerification.error 
      }, { status: 403 })
    }

    // Method 2: Verify route access
    const routeVerification = await verifyRouteAccess(session.user.id, '/officer')
    
    if (!routeVerification.isValid) {
      return NextResponse.json({ 
        error: 'Route access denied', 
        details: routeVerification.error 
      }, { status: 403 })
    }

    // At this point, we know the user has valid permissions
    // The session data has been verified server-side and cannot be manipulated
    
    return NextResponse.json({
      message: 'Access granted',
      user: {
        id: permissionVerification.session?.userId,
        discordId: permissionVerification.session?.discordId,
        name: permissionVerification.session?.userName,
        permissions: {
          hasCourtAccess: permissionVerification.session?.hasCourtAccess,
          hasCourtStaffAccess: permissionVerification.session?.hasCourtStaffAccess
        }
      },
      verified: true
    })
  } catch (error) {
    console.error('Error in secure API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify court staff permission for this operation
    const verification = await verifyPermission(session.user.id, 'courtweb.staff')
    
    if (!verification.isValid) {
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: verification.error 
      }, { status: 403 })
    }

    const body = await request.json()
    
    // Process the request with verified user data
    return NextResponse.json({
      message: 'Court staff operation completed',
      user: verification.session?.userName,
      data: body,
      verified: true
    })
  } catch (error) {
    console.error('Error in secure API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 