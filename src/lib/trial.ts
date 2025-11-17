// /src/lib/trial.ts
// Complete Trial Management System for OffboardPro

import { createClient } from '@/lib/supabase/client'

export const TRIAL_DURATION_DAYS = 14
export const TRIAL_PLAN = 'professional'

// List of disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'throwaway.email',
  'temp-mail.org',
  'fakeinbox.com',
  'mailinator.com',
  'maildrop.cc',
  'trashmail.com',
  'yopmail.com',
  'getnada.com',
  'emailondeck.com',
]

export interface TrialEligibility {
  eligible: boolean
  reason?: string
}

/**
 * Hash email for privacy (client-side version using simple hash)
 * Note: The database function handles actual hashing with md5()
 */
export function hashEmail(email: string): string {
  // Simple client-side hash for reference
  // The database will use md5() for actual storage
  return btoa(email.toLowerCase())
}

/**
 * Extract domain from email
 */
export function extractEmailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || ''
}

/**
 * Check if an email domain is disposable
 */
export function isDisposableEmail(email: string): boolean {
  const domain = extractEmailDomain(email)
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain)
}

/**
 * Check if user is eligible for trial (calls database function)
 * This function checks:
 * 1. Not a disposable email domain
 * 2. Email hasn't been used for trial before
 * 3. Domain hasn't exceeded trial limit (3 trials per 30 days)
 */
export async function checkTrialEligibility(email: string): Promise<TrialEligibility> {
  const supabase = createClient()
  
  try {
    // Call the database function we created
    const { data, error } = await supabase
      .rpc('check_trial_eligibility', {
        check_email: email.toLowerCase()
      })
    
    if (error) {
      console.error('Error checking trial eligibility:', error)
      return {
        eligible: false,
        reason: 'Unable to verify trial eligibility. Please try again.'
      }
    }
    
    // The function returns an array with one result
    const result = data?.[0]
    
    if (!result) {
      return {
        eligible: false,
        reason: 'Unable to verify trial eligibility.'
      }
    }
    
    return {
      eligible: result.eligible,
      reason: result.reason
    }
  } catch (error) {
    console.error('Trial eligibility check failed:', error)
    return {
      eligible: false,
      reason: 'System error. Please contact support.'
    }
  }
}

/**
 * Start trial for user (called after signup)
 * This should be called after successful email verification
 */
export async function startTrial(userId: string, email: string): Promise<boolean> {
  const supabase = createClient()
  const emailDomain = extractEmailDomain(email)
  const emailHash = hashEmail(email)
  const trialEndDate = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)
  
  try {
    // Update user to Professional trial
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_plan: TRIAL_PLAN,
        subscription_status: 'trialing',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndDate.toISOString(),
        email_domain: emailDomain
      })
      .eq('id', userId)
    
    if (updateError) {
      console.error('Error starting trial:', updateError)
      return false
    }
    
    // Log trial usage for tracking
    const { error: logError } = await supabase
      .from('trial_usage')
      .insert({
        user_id: userId,
        email: email.toLowerCase(),
        email_hash: emailHash,
        email_domain: emailDomain,
        trial_started_at: new Date().toISOString()
      })
    
    if (logError) {
      console.error('Error logging trial:', logError)
      // Don't fail the trial start if logging fails
    }
    
    console.log('✅ Trial started successfully for:', email)
    return true
  } catch (error) {
    console.error('Failed to start trial:', error)
    return false
  }
}

/**
 * Get trial status for a user
 */
export async function getTrialStatus(userId: string): Promise<{
  isOnTrial: boolean
  daysRemaining: number | null
  trialEndsAt: string | null
}> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status, trial_ends_at')
      .eq('id', userId)
      .single()
    
    if (error || !data) {
      return {
        isOnTrial: false,
        daysRemaining: null,
        trialEndsAt: null,
      }
    }
    
    const isOnTrial = data.subscription_status === 'trialing'
    
    if (!isOnTrial || !data.trial_ends_at) {
      return {
        isOnTrial: false,
        daysRemaining: null,
        trialEndsAt: null,
      }
    }
    
    const trialEnd = new Date(data.trial_ends_at)
    const now = new Date()
    const daysRemaining = Math.ceil(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    return {
      isOnTrial: true,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndsAt: data.trial_ends_at,
    }
  } catch (error) {
    console.error('Error getting trial status:', error)
    return {
      isOnTrial: false,
      daysRemaining: null,
      trialEndsAt: null,
    }
  }
}

/**
 * Get trial days remaining (from trial_ends_at string)
 */
export function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  
  const endDate = new Date(trialEndsAt)
  const now = new Date()
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false
  
  return new Date(trialEndsAt) < new Date()
}

/**
 * End a trial and downgrade to free plan
 * This is typically called by the cron job
 */
export async function endTrial(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('users')
      .update({
        subscription_plan: null, // Free plan (null)
        subscription_status: 'trial_ended',
        trial_ended_at: new Date().toISOString(),
      })
      .eq('id', userId)
    
    if (error) {
      console.error('Error ending trial:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error ending trial:', error)
    return false
  }
}

/**
 * Format trial status for display
 */
export function getTrialStatusMessage(user: any): string {
  if (!user) return ''
  
  if (user.subscription_status === 'trialing') {
    const daysRemaining = getTrialDaysRemaining(user.trial_ends_at)
    if (daysRemaining === 0) {
      return 'Trial ends today'
    } else if (daysRemaining === 1) {
      return 'Trial ends tomorrow'
    } else {
      return `${daysRemaining} days left in trial`
    }
  }
  
  if (user.subscription_status === 'trial_ended') {
    return 'Trial ended - Upgrade to continue'
  }
  
  return ''
}

/**
 * Get trial stats for analytics
 */
export async function getTrialStats(): Promise<{
  activeTrials: number
  expiredTrials: number
  convertedToPayingCustomers: number
}> {
  try {
    const supabase = createClient()
    
    // Active trials
    const { count: activeCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'trialing')
    
    // Expired trials
    const { count: expiredCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'trial_ended')
    
    // Converted to paying
    const { count: convertedCount } = await supabase
      .from('trial_usage')
      .select('*', { count: 'exact', head: true })
      .eq('converted_to_paid', true)
    
    return {
      activeTrials: activeCount || 0,
      expiredTrials: expiredCount || 0,
      convertedToPayingCustomers: convertedCount || 0,
    }
  } catch (error) {
    console.error('Error getting trial stats:', error)
    return {
      activeTrials: 0,
      expiredTrials: 0,
      convertedToPayingCustomers: 0,
    }
  }
}

/**
 * Mark a trial as converted to paid when user upgrades
 * This should be called from the Paddle webhook handler
 */
export async function markTrialConverted(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('trial_usage')
      .update({ converted_to_paid: true })
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error marking trial as converted:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error marking trial as converted:', error)
    return false
  }
        }
