import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const name = requestUrl.searchParams.get('name')

  // ✅ Fix: Await the async client creation
  const supabase = await createClient()

  // Exchange code for session
  const { data: { user } } = await supabase.auth.getUser()

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

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
