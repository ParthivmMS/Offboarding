import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Call the database function to downgrade expired trials
    const { data, error } = await supabaseAdmin
      .rpc('downgrade_expired_trials')
    
    if (error) {
      console.error('Error downgrading trials:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    const result = data && data.length > 0 ? data[0] : { downgraded_count: 0, user_emails: [] }
    
    console.log(`✅ Downgraded ${result.downgraded_count} expired trials`)
    
    // Send trial ended emails
    if (result.user_emails && result.user_emails.length > 0) {
      for (const email of result.user_emails) {
        try {
          // Get user details
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('name')
            .eq('email', email)
            .single()
          
          // Send trial ended email
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'trial_ended',
              to: [email],
              userName: userData?.name || 'there',
              upgradeLink: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
            })
          })
          
          console.log(`📧 Sent trial ended email to: ${email}`)
        } catch (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      downgraded: result.downgraded_count,
      emails_sent: result.user_emails?.length || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
