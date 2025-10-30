import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const name = requestUrl.searchParams.get('name')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')

  const supabase = await createClient()

  // Handle OAuth code exchange (for password reset emails)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // CASE 1: Password Recovery - Redirect to reset password page
  if (type === 'recovery' && user) {
    return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
  }

  // CASE 2: Team Invitation - Process invitation acceptance
  if (user && token) {
    // Get invitation
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (invitation) {
      // Create/update user profile
      await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: name || user.email?.split('@')[0],
          role: invitation.role,
          organization_id: invitation.organization_id,
          is_active: true,
          password_hash: 'supabase_auth',
        })

      // Accept invitation
      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)
    }
  }

  // Default: Redirect to dashboard
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
