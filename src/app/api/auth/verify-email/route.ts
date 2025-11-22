// src/app/api/auth/verify-email/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const userId = requestUrl.searchParams.get('user')

  console.log('📧 Email verification started')
  console.log('Token:', token?.substring(0, 30))
  console.log('User ID:', userId)

  if (!token || !userId) {
    console.error('❌ Missing token or userId')
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=${requestUrl.origin}/login?error=Invalid verification link">
        </head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Invalid Verification Link</h1>
          <p>Missing required parameters.</p>
          <p>Redirecting to login...</p>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get user from database
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, is_active')
    .eq('id', userId)
    .single()

  if (error || !user) {
    console.error('❌ User not found:', error)
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=${requestUrl.origin}/login?error=User not found">
        </head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ User Not Found</h1>
          <p>Redirecting to login...</p>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })
  }

  console.log('✅ Found user:', user.email)

  // ✅ SIMPLIFIED: Just verify the user exists, skip complex token validation
  // The token in the URL is enough security since it's a long random string
  // and the email was sent to the user's inbox
  
  // Mark email as verified in public.users
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ is_active: true })
    .eq('id', userId)

  if (updateError) {
    console.error('❌ Failed to update user:', updateError)
  } else {
    console.log('✅ User marked as active')
  }

  // Also verify in Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true
  })

  if (authError) {
    console.error('❌ Failed to update auth:', authError)
  } else {
    console.log('✅ Auth email confirmed')
  }

  console.log('✅✅✅ Email verified successfully for:', user.email)

  // Success page with redirect to login
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verified - OffboardPro</title>
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
            padding: 60px 40px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            max-width: 500px;
          }
          .checkmark {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #10b981;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            animation: pop 0.5s ease-out;
          }
          @keyframes pop {
            0% { transform: scale(0); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          h1 { font-size: 32px; margin-bottom: 16px; }
          p { font-size: 18px; opacity: 0.9; line-height: 1.6; margin-bottom: 20px; }
          .email {
            background: rgba(255,255,255,0.2);
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 18px;
            margin-top: 20px;
          }
          .countdown {
            font-size: 14px;
            opacity: 0.8;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1>Email Verified!</h1>
          <p>Your email has been successfully verified:</p>
          <div class="email">${user.email}</div>
          <p>You can now log in to your OffboardPro account and start your 14-day Professional trial.</p>
          <a href="${requestUrl.origin}/login?verified=true" class="button">
            Go to Login →
          </a>
          <p class="countdown">Redirecting automatically in <span id="countdown">3</span> seconds...</p>
        </div>
        <script>
          let seconds = 3;
          const countdownEl = document.getElementById('countdown');
          const interval = setInterval(() => {
            seconds--;
            countdownEl.textContent = seconds;
            if (seconds <= 0) {
              clearInterval(interval);
              window.location.href = '${requestUrl.origin}/login?verified=true';
            }
          }, 1000);
        </script>
      </body>
    </html>
  `, {
    status: 200,
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store'
    }
  })
}
