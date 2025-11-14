import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase with service role (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // You'll need to add this env var
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('paddle-signature')

    // Verify webhook signature (optional but recommended)
    // if (!verifyWebhookSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const event = JSON.parse(body)
    console.log('📥 Paddle webhook received:', event.event_type)

    // Handle different event types
    switch (event.event_type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event.data)
        break

      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data)
        break

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data)
        break

      case 'transaction.completed':
        await handleTransactionCompleted(event.data)
        break

      default:
        console.log('ℹ️ Unhandled event type:', event.event_type)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(data: any) {
  console.log('✅ Subscription created:', data.id)

  const userId = data.custom_data?.userId
  const planName = data.custom_data?.planName

  if (!userId) {
    console.error('❌ No userId in custom_data')
    return
  }

  try {
    // Update user's subscription status in database
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_plan: planName,
        paddle_subscription_id: data.id,
        paddle_customer_id: data.customer_id,
        subscription_start_date: data.started_at,
        trial_ends_at: data.trial_ends_at,
      })
      .eq('id', userId)

    if (error) {
      console.error('❌ Error updating user:', error)
    } else {
      console.log('✅ User subscription activated:', userId)
    }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
  }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('🔄 Subscription updated:', data.id)

  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: data.status,
        subscription_plan: data.custom_data?.planName,
      })
      .eq('paddle_subscription_id', data.id)

    if (error) {
      console.error('❌ Error updating subscription:', error)
    }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionUpdated:', error)
  }
}

async function handleSubscriptionCanceled(data: any) {
  console.log('❌ Subscription canceled:', data.id)

  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'canceled',
        subscription_canceled_at: new Date().toISOString(),
      })
      .eq('paddle_subscription_id', data.id)

    if (error) {
      console.error('❌ Error canceling subscription:', error)
    }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionCanceled:', error)
  }
}

async function handleTransactionCompleted(data: any) {
  console.log('💰 Transaction completed:', data.id)
  // Additional logic for completed transactions if needed
}

// Optional: Verify webhook signature for security
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) return false
  
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return true // Skip verification in development

  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(body).digest('hex')
  
  return signature === digest
}
