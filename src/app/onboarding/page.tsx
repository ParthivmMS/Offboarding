// src/app/onboarding/page.tsx
import { redirect } from 'next/navigation'

export default function OnboardingPage() {
  // Redirect to setup-organization page
  redirect('/setup-organization')
}
