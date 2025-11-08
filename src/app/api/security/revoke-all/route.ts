import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.current_organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get all active connections for this org
    const { data: activeConnections, error: fetchError } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('organization_id', userData.current_organization_id)
      .eq('status', 'active')

    if (fetchError) throw fetchError

    if (!activeConnections || activeConnections.length === 0) {
      return NextResponse.json({
        success: true,
        revokedCount: 0,
        message: 'No active connections to revoke',
      })
    }

    // Mark all as revoked
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('oauth_connections')
      .update({
        status: 'revoked',
        revoked_at: now,
        revoked_by: user.id,
        revocation_method: 'bulk',
      })
      .eq('organization_id', userData.current_organization_id)
      .eq('status', 'active')

    if (updateError) throw updateError

    // Create revocation logs
    const logs = activeConnections.map(conn => ({
      oauth_connection_id: conn.id,
      offboarding_id: conn.offboarding_id,
      organization_id: conn.organization_id,
      app_name: conn.app_name,
      employee_email: conn.employee_email,
      action: 'revoke_success',
      revocation_method: 'bulk',
      status_before: 'active',
      status_after: 'revoked',
      performed_by: user.id,
    }))

    await supabase.from('revocation_logs').insert(logs)

    // Send security alert email
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'security_alert',
          to: [user.email],
          alertType: 'bulk_revocation',
          revokedCount: activeConnections.length,
          performedBy: user.email,
        }),
      })
    } catch (emailError) {
      console.error('Failed to send security alert:', emailError)
    }

    return NextResponse.json({
      success: true,
      revokedCount: activeConnections.length,
      message: `Successfully revoked ${activeConnections.length} connections`,
    })

  } catch (error: any) {
    console.error('Revoke all error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to revoke connections' },
      { status: 500 }
    )
  }
}
