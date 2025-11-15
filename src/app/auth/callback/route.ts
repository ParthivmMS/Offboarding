import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const name = requestUrl.searchParams.get('name')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const error_code = requestUrl.searchParams.get('error_code')
  const error_description = requestUrl.searchParams.get('error_description')

  const supabase = await createClient()

  // Handle errors
  if (error_code) {
    console.error('Auth callback error:', error_description)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${error_description}`)
  }

  // CASE 1: Password Recovery with token_hash
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })
    
    if (error) {
      console.error('Token verification error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired reset link`)
    }
    
    // Successfully verified - redirect to reset password page
    return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
  }

  // CASE 2: OAuth code exchange (alternative password reset method + email verification)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Code exchange error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired link`)
    }
    
    // Check if this is a recovery flow
    if (type === 'recovery') {
      return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
    }

    // 🔒 NEW: Check if this is email verification for new signup
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Get user record to see if they need org setup
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, current_organization_id')
        .eq('id', user.id)
        .single()

      // If no organization, they just verified email - need to create org
      if (!userData?.organization_id && !userData?.current_organization_id) {
        return NextResponse.redirect(`${requestUrl.origin}/setup-organization`)
      }

      // User has org - activate them and go to dashboard
      await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', user.id)
        
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }
  }

  // Get current user for invitation processing
  const { data: { user } } = await supabase.auth.getUser()

  // CASE 3: Team Invitation - Process invitation acceptance
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
          current_organization_id: invitation.organization_id,
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
