// src/app/auth/callback/route.ts - SUPER DEBUG VERSION
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error_code = requestUrl.searchParams.get('error_code')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔍 ===== AUTH CALLBACK DEBUG START =====')
  console.log('🔍 Code:', code?.substring(0, 20) + '...')
  console.log('🔍 Error:', error_code, error_description)

  // Handle errors
  if (error_code) {
    console.error('❌ OAuth Error:', error_description)
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${requestUrl.origin}/login?error=${encodeURIComponent(error_description || 'Authentication failed')}">
        </head>
        <body><p>Authentication error. Redirecting...</p></body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (code) {
    const supabase = await createRouteHandlerClient()

    console.log('🔄 Step 1: Exchanging code for session...')
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('🔍 Step 2: Exchange result:', {
      hasUser: !!data.user,
      userEmail: data.user?.email,
      userId: data.user?.id,
      hasSession: !!data.session,
      error: error?.message
    })

    if (error) {
      console.error('❌ Code exchange error:', error)
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta http-equiv="refresh" content="0;url=${requestUrl.origin}/login?error=Authentication failed">
          </head>
          <body><p>Authentication failed. Redirecting...</p></body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (data.user) {
      console.log('✅ Step 3: User from code exchange:', data.user.email, data.user.id)

      // NOW CHECK: What session does Supabase think we have?
      console.log('🔍 Step 4: Checking current session in Supabase...')
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      console.log('🔍 Step 5: Current session check:', {
        hasSession: !!currentSession,
        sessionUserEmail: currentSession?.user?.email,
        sessionUserId: currentSession?.user?.id,
      })

      // CRITICAL CHECK: Do they match?
      if (currentSession?.user?.email !== data.user.email) {
        console.error('🚨🚨🚨 SESSION MISMATCH DETECTED! 🚨🚨🚨')
        console.error('Expected:', data.user.email, data.user.id)
        console.error('Got:', currentSession?.user?.email, currentSession?.user?.id)
        console.error('This means cookies are NOT being set properly!')
      } else {
        console.log('✅ Session matches! Cookies are working correctly.')
      }

      // Check if user has organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, organization_id, current_organization_id')
        .eq('id', data.user.id)
        .single()

      console.log('🔍 Step 6: User data from database:', {
        userData,
        userError: userError?.message
      })

      // Determine redirect URL
      const hasOrganization = userData?.organization_id || userData?.current_organization_id
      const redirectUrl = hasOrganization 
        ? `${requestUrl.origin}/dashboard`
        : `${requestUrl.origin}/setup-organization`

      console.log('🎯 Step 7: Redirecting to:', redirectUrl)
      console.log('🔍 ===== AUTH CALLBACK DEBUG END =====')

      // Return response with session info embedded
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>OffboardPro - Authenticating</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                max-width: 500px;
              }
              .spinner {
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 30px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              h1 { font-size: 24px; margin-bottom: 12px; }
              p { font-size: 16px; opacity: 0.9; line-height: 1.5; margin-bottom: 10px; }
              .debug {
                background: rgba(0, 0, 0, 0.3);
                padding: 15px;
                border-radius: 8px;
                font-size: 12px;
                margin-top: 20px;
                text-align: left;
                font-family: monospace;
              }
              .logo {
                width: 60px;
                height: 60px;
                background: white;
                border-radius: 12px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">👥</div>
              <div class="spinner"></div>
              <h1>✅ Authentication Successful!</h1>
              <p><strong>Logged in as: ${data.user.email}</strong></p>
              <p>Setting up your account...</p>
              
              <div class="debug">
                <strong>🔍 Debug Info:</strong><br>
                User ID: ${data.user.id}<br>
                Email: ${data.user.email}<br>
                Session: ${currentSession?.user?.email || 'NO SESSION'}<br>
                Match: ${currentSession?.user?.email === data.user.email ? '✅ YES' : '❌ NO - PROBLEM!'}<br>
                Redirect: ${hasOrganization ? 'Dashboard' : 'Setup'}
              </div>
            </div>
            <script>
              console.log('🔍 CLIENT: Verification page loaded');
              console.log('🔍 CLIENT: User from server:', '${data.user.email}');
              console.log('🔍 CLIENT: Will redirect in 3 seconds to:', '${redirectUrl}');
              
              setTimeout(function() {
                console.log('🔍 CLIENT: Redirecting now...');
                window.location.href = '${redirectUrl}';
              }, 3000);
            </script>
          </body>
        </html>
      `, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      })
    }
  }

  // Fallback
  console.log('⚠️ No code found, redirecting to login')
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${requestUrl.origin}/login">
      </head>
      <body><p>Redirecting to login...</p></body>
    </html>
  `, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  })
}
