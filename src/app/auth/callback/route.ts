import { createRouteHandlerClient } from '@/lib/supabase/server' // ← CHANGED
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error_code = requestUrl.searchParams.get('error_code')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔍 OAuth Callback - Start', {
    hasCode: !!code,
    hasError: !!error_code,
    path: requestUrl.pathname
  })

  // Handle errors from OAuth provider
  if (error_code) {
    console.error('❌ OAuth Error:', error_description)
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${requestUrl.origin}/login?error=${encodeURIComponent(error_description || 'Authentication failed')}">
        </head>
        <body>
          <p>Authentication error. Redirecting...</p>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (code) {
    const supabase = await createRouteHandlerClient() // ← CHANGED - Now cookies will work!

    console.log('🔄 Exchanging OAuth code for session')
    
    // Exchange code for session
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('❌ Code exchange error:', error)
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta http-equiv="refresh" content="0;url=${requestUrl.origin}/login?error=Authentication failed">
          </head>
          <body>
            <p>Authentication failed. Redirecting...</p>
          </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (user) {
      console.log('✅ User authenticated:', user.email)

      // Check if user has organization
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, current_organization_id')
        .eq('id', user.id)
        .single()

      console.log('📊 User data:', {
        userId: user.id,
        userEmail: user.email,
        hasOrgId: !!userData?.organization_id,
        hasCurrentOrgId: !!userData?.current_organization_id
      })

      // Determine redirect URL
      const hasOrganization = userData?.organization_id || userData?.current_organization_id
      const redirectUrl = hasOrganization 
        ? `${requestUrl.origin}/dashboard`
        : `${requestUrl.origin}/setup-organization`

      console.log('🎯 Redirecting to:', redirectUrl)

      // Use HTML meta refresh + JavaScript redirect
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta http-equiv="refresh" content="1;url=${redirectUrl}">
            <title>OffboardPro - Authenticating</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
                border: 1px solid rgba(255, 255, 255, 0.18);
                max-width: 400px;
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
              h1 {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 12px;
              }
              p {
                font-size: 16px;
                opacity: 0.9;
                line-height: 1.5;
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
              <h1>✅ Welcome, ${user.email}!</h1>
              <p>Setting up your account...</p>
              <p style="margin-top: 20px; font-size: 14px; opacity: 0.7;">
                You'll be redirected to ${hasOrganization ? 'your dashboard' : 'complete setup'} in a moment.
              </p>
            </div>
            <script>
              setTimeout(function() {
                window.location.href = '${redirectUrl}';
              }, 1000);
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

  // Fallback redirect if no code
  console.log('⚠️ No code found, redirecting to login')
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${requestUrl.origin}/login">
      </head>
      <body>
        <p>Redirecting to login...</p>
      </body>
    </html>
  `, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  })
}
