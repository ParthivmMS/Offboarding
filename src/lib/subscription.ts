// Subscription limits and feature access control
export const PLAN_LIMITS = {
  starter: {
    name: 'Starter',
    maxTeamMembers: 25,
    maxOffboardingsPerMonth: 10,
    maxTemplates: 5,
    hasAI: false,
    hasSecurityScanner: false,
    hasExitSurveys: false,
    hasAPI: false,
    hasPrioritySupport: false,
    hasCustomBranding: false,
  },
  professional: {
    name: 'Professional',
    maxTeamMembers: 100,
    maxOffboardingsPerMonth: 50,
    maxTemplates: 20,
    hasAI: true,
    hasSecurityScanner: true,
    hasExitSurveys: true,
    hasAPI: false,
    hasPrioritySupport: false,
    hasCustomBranding: false,
  },
  enterprise: {
    name: 'Enterprise',
    maxTeamMembers: Infinity,
    maxOffboardingsPerMonth: Infinity,
    maxTemplates: Infinity,
    hasAI: true,
    hasSecurityScanner: true,
    hasExitSurveys: true,
    hasAPI: true,
    hasPrioritySupport: true,
    hasCustomBranding: true,
  },
}

export type PlanName = keyof typeof PLAN_LIMITS

// Get limits for a specific plan
export function getPlanLimits(plan?: string | null) {
  if (!plan) return PLAN_LIMITS.starter
  
  const normalizedPlan = plan.toLowerCase().trim() as PlanName
  return PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS.starter
}

// Check if user can invite more team members
export function canInviteMoreMembers(currentCount: number, plan?: string | null): boolean {
  const limits = getPlanLimits(plan)
  return currentCount < limits.maxTeamMembers
}

// Get remaining team member slots
export function getRemainingMemberSlots(currentCount: number, plan?: string | null): number {
  const limits = getPlanLimits(plan)
  if (limits.maxTeamMembers === Infinity) return Infinity
  return Math.max(0, limits.maxTeamMembers - currentCount)
}

// Check if user has access to a specific feature
export function hasFeatureAccess(feature: string, plan?: string | null): boolean {
  const limits = getPlanLimits(plan)
  
  switch (feature.toLowerCase()) {
    case 'ai':
    case 'ai_insights':
      return limits.hasAI
      
    case 'security':
    case 'security_scanner':
      return limits.hasSecurityScanner
      
    case 'surveys':
    case 'exit_surveys':
      return limits.hasExitSurveys
      
    case 'api':
      return limits.hasAPI
      
    case 'priority_support':
      return limits.hasPrioritySupport
      
    case 'custom_branding':
      return limits.hasCustomBranding
      
    default:
      return true // Unknown features are accessible by default
  }
}

// Get feature name for display
export function getFeatureDisplayName(feature: string): string {
  const names: Record<string, string> = {
    ai: 'AI Insights',
    ai_insights: 'AI Insights',
    security: 'Security Scanner',
    security_scanner: 'Security Scanner',
    surveys: 'Exit Surveys',
    exit_surveys: 'Exit Surveys',
    api: 'API Access',
    priority_support: 'Priority Support',
    custom_branding: 'Custom Branding',
  }
  
  return names[feature.toLowerCase()] || feature
}

// Get upgrade message for a feature
export function getUpgradeMessage(feature: string): string {
  const featureName = getFeatureDisplayName(feature)
  return `${featureName} is available on Professional and Enterprise plans`
}

// Check if user is on trial
export function isOnTrial(user: any): boolean {
  if (!user) return false
  
  const subscriptionStatus = user.subscription_status
  const trialEndsAt = user.trial_ends_at
  
  if (subscriptionStatus === 'trialing' && trialEndsAt) {
    return new Date(trialEndsAt) > new Date()
  }
  
  return false
}

// Get trial days remaining
export function getTrialDaysRemaining(user: any): number {
  if (!isOnTrial(user)) return 0
  
  const trialEndsAt = new Date(user.trial_ends_at)
  const now = new Date()
  const diffTime = trialEndsAt.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

// Check if subscription is active (including trial)
export function hasActiveSubscription(user: any): boolean {
  if (!user) return false
  
  const status = user.subscription_status
  return status === 'active' || status === 'trialing'
}

// Get plan badge color
export function getPlanBadgeColor(plan?: string | null): string {
  const normalizedPlan = plan?.toLowerCase().trim()
  
  switch (normalizedPlan) {
    case 'starter':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'professional':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'enterprise':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}
