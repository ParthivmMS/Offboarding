'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Lock, Sparkles, Shield, Mail, Crown } from 'lucide-react'
import { hasFeatureAccess, getFeatureDisplayName, getPlanLimits } from '@/lib/subscription'

interface FeatureGateProps {
  feature: string
  userPlan?: string | null
  subscriptionStatus?: string | null
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

export default function FeatureGate({ 
  feature, 
  userPlan,
  subscriptionStatus,
  children,
  fallback,
  showUpgradePrompt = true
}: FeatureGateProps) {
  const router = useRouter()
  const hasAccess = hasFeatureAccess(feature, userPlan, subscriptionStatus)
  
  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showUpgradePrompt) {
    return null
  }

  // Get icon based on feature
  const getFeatureIcon = () => {
    const f = feature.toLowerCase()
    if (f.includes('ai')) return Sparkles
    if (f.includes('security')) return Shield
    if (f.includes('survey')) return Mail
    return Lock
  }

  const Icon = getFeatureIcon()
  const featureName = getFeatureDisplayName(feature)
  const currentLimits = getPlanLimits(userPlan)
  
  // All locked features now unlock with Professional (since Enterprise is removed)
  const unlockPlan = 'Professional'

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-slate-200">
          <Icon className="w-10 h-10 text-slate-400" />
        </div>

        {/* Heading */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-slate-500" />
          <h3 className="text-xl font-bold text-slate-900">
            {featureName} Locked
          </h3>
        </div>

        {/* Description */}
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
          You're currently on the <strong className="text-slate-900">{currentLimits.name}</strong> plan.
          <br />
          Upgrade to <strong className="text-blue-600">{unlockPlan}</strong> to unlock this feature.
        </p>

        {/* Features List */}
        <div className="bg-white rounded-lg p-4 mb-6 text-left border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            What you'll get:
          </p>
          <ul className="space-y-2 text-sm">
            {feature.toLowerCase().includes('ai') && (
              <>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">AI-powered exit interview analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Churn pattern detection & alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Actionable retention insights</span>
                </li>
              </>
            )}
            
            {feature.toLowerCase().includes('security') && (
              <>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Scan for active OAuth connections</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Bulk revoke access to 20+ apps</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Detailed audit logs</span>
                </li>
              </>
            )}
            
            {feature.toLowerCase().includes('survey') && (
              <>
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Automated exit surveys via email</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Custom survey questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">Anonymous response collection</span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => router.push('/pricing')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
          >
            <Crown className="w-4 h-4 mr-2" />
            View Plans & Pricing
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="border-slate-300 hover:bg-slate-50"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-500 mt-6">
          ⚡ Upgrade anytime • 14-day free trial
        </p>
      </div>
    </div>
  )
}

// Smaller inline version for buttons/UI elements
export function FeatureGateInline({ 
  feature, 
  userPlan,
  subscriptionStatus,
  children 
}: {
  feature: string
  userPlan?: string | null
  subscriptionStatus?: string | null
  children: ReactNode
}) {
  const hasAccess = hasFeatureAccess(feature, userPlan, subscriptionStatus)
  
  if (!hasAccess) {
    return (
      <div className="opacity-50 pointer-events-none relative">
        {children}
        <Lock className="w-4 h-4 absolute top-2 right-2 text-slate-400" />
      </div>
    )
  }
  
  return <>{children}</>
}
