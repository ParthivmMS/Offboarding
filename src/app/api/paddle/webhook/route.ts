import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase with service role (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // 🔒 CRITICAL: Verify webhook signature for security
    if (!verifyWebhookSignature(body, signature)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

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

      case 'subscription.activated':
        await handleSubscriptionActivated(event.data)
        break

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data)
        break

      case 'subscription.past_due':
        await handleSubscriptionPastDue(event.data)
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
    // Determine subscription status (trialing or active)
    const status = data.status || (data.trial_dates ? 'trialing' : 'active')

    // Update user's subscription status in database
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: status,
        subscription_plan: planName,
        paddle_subscription_id: data.id,
        paddle_customer_id: data.customer_id,
        subscription_start_date: data.started_at || new Date().toISOString(),
        trial_ends_at: data.trial_dates?.ends_at || null,
      })
      .eq('id', userId)

    if (error) {
      console.error('❌ Error updating user:', error)
    } else {
      console.log('✅ User subscription created:', userId, '| Status:', status)
    }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
  }
}

async function handleSubscriptionActivated(data: any) {
  console.log('✅ Subscription activated (trial ended):', data.id)

  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
      })
      .eq('paddle_subscription_id', data.id)

    if (error) {
      console.error('❌ Error activating subscription:', error)
    } else {
      console.log('✅ Subscription activated:', data.id)
    }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionActivated:', error)
  }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('🔄 Subscription updated:', data.id)

  try {
    const updateData: any = {
      subscription_status: data.status,
    }

    // Update plan name if provided
    if (data.custom_data?.planName) {
      updateData.subscription_plan = data.custom_data.planName
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('paddle_subscription_id', data.id)

    if (error) {
      console.error('❌ Error updating subscription:', error)
    } else {
      console.log('✅ Subscription updated:', data.id)
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
    } else {
      console.log('✅ Subscription canceled:', data.id)
    }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionCanceled:', error)
  }
}

async function handleSubscriptionPastDue(data: any) {
  console.log('⚠️ Subscription past due:', data.id)

  try {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
      })
      .eq('paddle_subscription_id', data.id)

    if (error) {
      console.error('❌ Error updating past due subscription:', error)
    } else {
      console.log('⚠️ Subscription marked past due:', data.id)
    }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionPastDue:', error)
  }
}

async function handleTransactionCompleted(data: any) {
  console.log('💰 Transaction completed:', data.id)
  // Additional logic for completed transactions if needed
  // This event fires when payment is successful
}

/**
 * 🔒 CRITICAL: Verify Paddle webhook signature
 * Prevents unauthorized requests from modifying user subscriptions
 */
function verifyWebhookSignature(body: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) {
    console.error('❌ No signature header provided')
    return false
  }

  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) {
    console.error('❌ PADDLE_WEBHOOK_SECRET not set in environment variables!')
    return false
  }

  try {
    // Paddle sends signature in format: "ts=timestamp;h1=signature"
    const parts = signatureHeader.split(';')
    const timestamp = parts.find(p => p.startsWith('ts='))?.split('=')[1]
    const h1Signature = parts.find(p => p.startsWith('h1='))?.split('=')[1]

    if (!timestamp || !h1Signature) {
      console.error('❌ Invalid signature format')
      return false
    }

    // Verify timestamp is recent (within 5 minutes to prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000)
    const signatureTime = parseInt(timestamp)
    const timeDiff = currentTime - signatureTime

    if (timeDiff > 300) { // 5 minutes
      console.error('❌ Signature timestamp too old:', timeDiff, 'seconds')
      return false
    }

    // Recreate the signature using the body and timestamp
    const signedPayload = `${timestamp}:${body}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(h1Signature),
      Buffer.from(expectedSignature)
    )

    if (!isValid) {
      console.error('❌ Signature verification failed')
    }

    return isValid
  } catch (error) {
    console.error('❌ Error verifying signature:', error)
    return false
  }
}
