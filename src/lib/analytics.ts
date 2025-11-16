// Event tracking functions for Google Analytics

export const GA_TRACKING_ID = 'G-CTG8F4FQR4'

// Track page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    })
  }
}

// Track custom events
export const event = ({ action, category, label, value }: {
  action: string
  category: string
  label?: string
  value?: number
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Predefined events for common actions
export const trackSignup = (method: string = 'email') => {
  event({
    action: 'sign_up',
    category: 'engagement',
    label: method
  })
}

export const trackLogin = (method: string = 'email') => {
  event({
    action: 'login',
    category: 'engagement',
    label: method
  })
}

export const trackOffboardingCreated = () => {
  event({
    action: 'offboarding_created',
    category: 'engagement',
    label: 'new_offboarding'
  })
}

export const trackTaskCompleted = () => {
  event({
    action: 'task_completed',
    category: 'engagement',
    label: 'task_completion'
  })
}

export const trackInviteSent = (role: string) => {
  event({
    action: 'invite_sent',
    category: 'engagement',
    label: role
  })
}

export const trackSubscriptionStarted = (plan: string) => {
  event({
    action: 'subscription_started',
    category: 'conversion',
    label: plan
  })
}

export const trackTrialStarted = () => {
  event({
    action: 'trial_started',
    category: 'conversion',
    label: 'free_trial'
  })
}

export const trackSecurityScan = () => {
  event({
    action: 'security_scan',
    category: 'engagement',
    label: 'app_scan'
  })
}

export const trackExitSurveySubmitted = () => {
  event({
    action: 'exit_survey_submitted',
    category: 'engagement',
    label: 'survey_completion'
  })
}

export const trackAIInsightsViewed = () => {
  event({
    action: 'ai_insights_viewed',
    category: 'engagement',
    label: 'insights_page'
  })
}

// 🆕 NEW: Track upgrade clicks
export const trackUpgradeClicked = (source: string, plan?: string) => {
  event({
    action: 'upgrade_clicked',
    category: 'conversion',
    label: `${source}${plan ? `_${plan}` : ''}`
  })
}

// 🆕 NEW: Track feature gate shown
export const trackFeatureGateShown = (feature: string) => {
  event({
    action: 'feature_gate_shown',
    category: 'engagement',
    label: feature
  })
}
