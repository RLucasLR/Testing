import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteSession } from '@/lib/session-store'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (session?.user?.id) {
      // Clean up session from court database
      await deleteSession(session.user.id)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error during signout cleanup:', error)
    return NextResponse.json({ success: true }) // Don't fail the signout process
  }
} 