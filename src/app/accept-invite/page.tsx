'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Loader2, Mail, Clock } from 'lucide-react'

type Step = 'validate' | 'signup' | 'check-email' | 'login' | 'accepting' | 'complete'

function AcceptInviteContent() {
  const [step, setStep] = useState<Step>('validate')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      validateInvitation()
    } else {
      setError('Invalid invitation link')
      setLoading(false)
    }
  }, [token])

  async function validateInvitation() {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          organizations (name)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setError('This invitation is invalid or has already been used')
        setLoading(false)
        return
      }

      const expiresAt = new Date(data.expires_at)
      if (expiresAt < new Date()) {
        setError('This invitation has expired')
        setLoading(false)
        return
      }

      setInvitation(data)
      await checkExistingUser(data.email)
    } catch (error) {
      console.error('Error validating invitation:', error)
      setError('Failed to validate invitation')
      setLoading(false)
    }
  }

  async function checkExistingUser(email: string) {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      setStep(existingUser ? 'login' : 'signup')
    } catch (error) {
      console.error('Error checking user:', error)
      setStep('signup')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup() {
    setError('')

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?token=${token}&name=${encodeURIComponent(name)}`,
        },
      })

      if (signUpError) throw signUpError

      console.log('✅ Signup successful, verification email sent')
      setStep('check-email')
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.message || 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogin() {
    setError('')

    if (!loginPassword) {
      setError('Please enter your password')
      return
    }

    setSubmitting(true)

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: loginPassword,
      })

      if (loginError) throw loginError
      if (!data.user) throw new Error('Login failed')

      console.log('✅ Login successful')
      
      // Show "accepting invitation" message
      setStep('accepting')

      // Process invitation
      await processInvitationAcceptance(data.user.id)
      
      // Show success message briefly
      setStep('complete')
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Invalid password')
      setSubmitting(false)
    }
  }

  async function processInvitationAcceptance(userId: string) {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('id', userId)
        .maybeSingle()

      if (existing) {
        // Check if already in this organization
        if (existing.organization_id === invitation.organization_id) {
          console.log('User already in organization')
          return
        }

        // Update to new organization
        await supabase
          .from('users')
          .update({
            organization_id: invitation.organization_id,
            role: invitation.role,
            is_active: true,
          })
          .eq('id', userId)
      } else {
        // Create new user profile
        await supabase
          .from('users')
          .insert({
            id: userId,
            email: invitation.email,
            name: name.trim() || invitation.email.split('@')[0],
            role: invitation.role,
            organization_id: invitation.organization_id,
            is_active: true,
            password_hash: 'supabase_auth',
          })
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)

      // Expire other pending invitations for this email
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('email', invitation.email)
        .eq('organization_id', invitation.organization_id)
        .eq('status', 'pending')
        .neq('id', invitation.id)

      console.log('✅ Invitation accepted successfully')
    } catch (error) {
      console.error('Error processing invitation:', error)
      throw error
    }
  }

  function formatRole(role: string) {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Signup step
  if (step === 'signup') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-6 h-6" />
              <CardTitle>Accept Invitation</CardTitle>
            </div>
            <CardDescription>
              Join <strong>{invitation?.organizations?.name}</strong> as a{' '}
              <strong>{formatRole(invitation?.role)}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check email step (after signup)
  if (step === 'check-email') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Mail className="w-6 h-6" />
              <CardTitle>📧 Confirmation Email Sent!</CardTitle>
            </div>
            <CardDescription>
              We've sent a verification email to <strong>{invitation?.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                ✉️ Check Your Email Inbox
              </p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Open your email inbox</li>
                <li>Look for email from OffboardPro</li>
                <li>Click the "Confirm Your Signup" link</li>
                <li>You'll be automatically logged in!</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Note:</strong> The email might take a minute to arrive. Check your spam folder if you don't see it.
              </p>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                After confirming, you'll be added to <strong>{invitation?.organizations?.name}</strong> as a{' '}
                <strong>{formatRole(invitation?.role)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Login step (for existing users)
  if (step === 'login') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <CheckCircle className="w-6 h-6" />
              <CardTitle>Welcome Back!</CardTitle>
            </div>
            <CardDescription>
              You already have an account. Login to accept the invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-900">
                  <strong>You're invited to join:</strong>
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>{invitation?.organizations?.name}</strong> as a{' '}
                  <strong>{formatRole(invitation?.role)}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginPassword">Password</Label>
                <Input
                  id="loginPassword"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={submitting}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login & Accept Invitation'
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('signup')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Not your account? Create new account
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Accepting invitation (processing)
  if (step === 'accepting') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Clock className="w-6 h-6" />
              <CardTitle>Accepting Invitation...</CardTitle>
            </div>
            <CardDescription>
              Processing your invitation to {invitation?.organizations?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">Please wait</p>
              <p className="text-sm text-gray-600">
                Setting up your account as {formatRole(invitation?.role)}...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Complete step (success)
  if (step === 'complete') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-6 h-6" />
              <CardTitle>🎉 Invitation Accepted!</CardTitle>
            </div>
            <CardDescription>
              Successfully joined {invitation?.organizations?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-green-900 mb-2">
                  ✅ All Set!
                </p>
                <p className="text-sm text-green-800">
                  You've been added to <strong>{invitation?.organizations?.name}</strong> as a{' '}
                  <strong>{formatRole(invitation?.role)}</strong>
                </p>
              </div>

              <div className="text-center py-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Redirecting to dashboard...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
            }
