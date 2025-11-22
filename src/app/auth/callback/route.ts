// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return handleAuthCallback(request)
}

export async function POST(request: NextRequest) {
  return handleAuthCallback(request)
}

async function handleAuthCallback(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // ✅ FIX: Check for BOTH code AND token parameters!
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token')
  const verificationCode = code || token  // Use whichever exists
  
  const error_code = requestUrl.searchParams.get('error_code')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔍 ===== AUTH CALLBACK DEBUG START =====')
  console.log('🔍 Method:', request.method)
  console.log('🔍 Code param:', code?.substring(0, 20) + '...')
  console.log('🔍 Token param:', token?.substring(0, 20) + '...')
  console.log('🔍 Using:', verificationCode ? 'Found!' : 'None')
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

  if (verificationCode) {
    const supabase = await createRouteHandlerClient()

    console.log('🔄 Step 1: Exchanging verification code for session...')
    
    // Exchange code/token for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(verificationCode)

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

      // Check current session
      console.log('🔍 Step 4: Checking current session in Supabase...')
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      console.log('🔍 Step 5: Current session check:', {
        hasSession: !!currentSession,
        sessionUserEmail: currentSession?.user?.email,
        sessionUserId: currentSession?.user?.id,
      })

      // Check if they match
      if (currentSession?.user?.email !== data.user.email) {
        console.error('🚨 SESSION MISMATCH!')
        console.error('Expected:', data.user.email)
        console.error('Got:', currentSession?.user?.email)
      } else {
        console.log('✅ Session matches! Cookies working correctly.')
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

      // Return response
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
              <h1>✅ Welcome, ${data.user.email}!</h1>
              <p>Setting up your account...</p>
              <p style="font-size: 14px; opacity: 0.7; margin-top: 20px;">
                Redirecting in 2 seconds...
              </p>
            </div>
            <script>
              console.log('🔍 CLIENT: Logged in as:', '${data.user.email}');
              console.log('🔍 CLIENT: Redirecting to:', '${redirectUrl}');
              
              setTimeout(function() {
                window.location.href = '${redirectUrl}';
              }, 2000);
            </script>
          </body>
        </html>
      `, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      })
    }
  }

  // Fallback
  console.log('⚠️ No code or token found, redirecting to login')
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
