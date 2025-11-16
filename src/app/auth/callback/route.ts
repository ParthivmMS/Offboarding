// src/app/auth/callback/route.ts
import { createClientForRouteHandler } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const name = requestUrl.searchParams.get('name')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const error_code = requestUrl.searchParams.get('error_code')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔍 Callback invoked')

  // Handle errors
  if (error_code) {
    console.error('❌ Auth callback error:', error_description)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${error_description}`)
  }

  // Create supabase client that can properly set cookies in response
  const { supabase, response } = await createClientForRouteHandler(request)

  // CASE 1: Password Recovery with token_hash
  if (token_hash && type === 'recovery') {
    console.log('🔑 Processing password recovery')
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })
    
    if (error) {
      console.error('❌ Token verification error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired reset link`)
    }
    
    console.log('✅ Password recovery verified')
    return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
  }

  // CASE 2: OAuth code exchange
  if (code) {
    console.log('🔄 Exchanging OAuth code for session')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('❌ Code exchange error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid or expired link`)
    }
    
    if (type === 'recovery') {
      return NextResponse.redirect(`${requestUrl.origin}/reset-password`)
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('👤 Current user:', { id: user?.id, email: user?.email })
    
    if (user) {
      // Check for existing users with this email
      console.log('🔍 Checking for existing users')
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id, organization_id, current_organization_id, role, email')
        .eq('email', user.email)
        .order('created_at', { ascending: true })

      console.log('📊 Existing users:', existingUsers?.length)

      let targetUser = null

      if (existingUsers && existingUsers.length > 0) {
        // Find user with organization
        targetUser = existingUsers.find(u => u.organization_id || u.current_organization_id)
        
        if (!targetUser) {
          targetUser = existingUsers[0]
        }

        // Account linking
        if (targetUser.id !== user.id && targetUser.organization_id) {
          console.log('🔗 Linking accounts')
          console.log(`  Google ID: ${user.id}`)
          console.log(`  Existing ID: ${targetUser.id}`)
          
          await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0],
              organization_id: targetUser.organization_id,
              current_organization_id: targetUser.current_organization_id,
              role: targetUser.role,
              is_active: true,
              password_hash: 'supabase_auth',
            }, {
              onConflict: 'id'
            })

          if (targetUser.organization_id) {
            await supabase
              .from('organization_members')
              .upsert({
                user_id: user.id,
                organization_id: targetUser.organization_id,
                role: targetUser.role || 'admin',
                is_active: true,
              }, {
                onConflict: 'user_id,organization_id'
              })
          }

          console.log('✅ Accounts linked, redirecting to dashboard')
          const redirectResponse = NextResponse.redirect(`${requestUrl.origin}/dashboard`)
          
          // Copy cookies from our response to redirect response
          response.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
          })
          
          return redirectResponse
        }
      }

      // Check user's organization status
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, current_organization_id')
        .eq('id', user.id)
        .single()

      console.log('📊 User data:', userData)

      if (!userData?.organization_id && !userData?.current_organization_id) {
        console.log('⚠️ No organization, redirecting to setup')
        const redirectResponse = NextResponse.redirect(`${requestUrl.origin}/setup-organization`)
        
        // Copy cookies to redirect response
        response.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        
        return redirectResponse
      }

      // User has org
      console.log('✅ User has organization, redirecting to dashboard')
      await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', user.id)
        
      const redirectResponse = NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      
      // Copy cookies to redirect response
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      
      return redirectResponse
    }
  }

  // CASE 3: Team Invitation
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user && token) {
    console.log('📧 Processing team invitation')
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (invitation) {
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

      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)
    }
  }

  console.log('🔚 Redirecting to dashboard')
  const redirectResponse = NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  
  // Copy cookies to redirect response
  response.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  
  return redirectResponse
}
