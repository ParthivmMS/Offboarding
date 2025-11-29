'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation' // ✅ CHANGED: Import useParams
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

function AcceptInviteContent() {
  const router = useRouter()
  const params = useParams() // ✅ CHANGED: Use useParams instead of useSearchParams
  const token = params.token as string // ✅ CHANGED: Get token from URL segment
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [wrongAccountWarning, setWrongAccountWarning] = useState<string>('')
  const [existingUser, setExistingUser] = useState(false)
  const [loginMode, setLoginMode] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (token) {
      verifyInvitation()
    } else {
      setError('No invitation token provided')
      setLoading(false)
    }
  }, [token])

  async function verifyInvitation() {
  const supabase = createClient()
  
  try {
    console.log('🔍 ===== STARTING INVITATION VERIFICATION =====')
    console.log('🔍 Token received:', token)
    
    // ✅ Query ONLY invitation fields (no joins, no users table)
    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        organization_id,
        status,
        token,
        expires_at,
        created_at,
        invited_by
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()

    console.log('📊 Invite data:', invite)
    console.log('📊 Invite error:', inviteError)

    if (inviteError) {
      console.error('❌ Database error:', inviteError)
      setError('This invitation is invalid or has already been used')
      setLoading(false)
      return
    }

    if (!invite) {
      console.error('❌ No invitation found')
      setError('This invitation is invalid or has already been used')
      setLoading(false)
      return
    }

    console.log('✅ Invitation found!')

    // ✅ Fetch organization name separately and create enriched object
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', invite.organization_id)
      .single()
    
    // ✅ Create enriched invitation object with organization
    const enrichedInvite = {
      ...invite,
      organization: orgData ? { name: orgData.name } : { name: 'Your Organization' }
    }

    // Check if invitation is expired
    const expiresAt = new Date(enrichedInvite.expires_at)
    const now = new Date()
    
    if (expiresAt < now) {
      console.error('❌ Invitation has expired')
      setError('This invitation has expired')
      setLoading(false)
      return
    }

    console.log('✅ Invitation is valid!')

    setInvitation(enrichedInvite)
    setFormData(prev => ({ ...prev, email: enrichedInvite.email }))

    // Check if user is currently logged in
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Verify email matches invitation
      if (user.email?.toLowerCase() === enrichedInvite.email.toLowerCase()) {
        // Correct user - accept invitation
        await acceptInvitationForExistingUser(user.id, enrichedInvite)
      } else {
        // Wrong user logged in
        setWrongAccountWarning(
          `You're currently logged in as ${user.email}, but this invitation is for ${enrichedInvite.email}. Please logout and login with the correct account, or create a new account.`
        )
        setLoading(false)
      }
    } else {
      // No user logged in - show signup form
      setLoading(false)
    }
    
  } catch (err: any) {
    console.error('Error verifying invitation:', err)
    setError('Failed to verify invitation')
    setLoading(false)
  }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setWrongAccountWarning('')
    setLoading(false)
  }

  async function acceptInvitationForExistingUser(userId: string, invite: any) {
    const supabase = createClient()
    
    try {
      console.log('🎯 Accepting invitation for user:', userId)
      console.log('🏢 Organization:', invite.organization_id)
      console.log('👤 Role:', invite.role)

      // ✅ Call the SECURITY DEFINER function to bypass RLS
      const { data: addResult, error: addError } = await supabase
        .rpc('add_user_to_organization', {
          target_user_id: userId,
          target_org_id: invite.organization_id,
          user_role: invite.role
        })

      if (addError) {
        console.error('❌ Error calling add_user_to_organization:', addError)
        throw new Error(addError.message || 'Failed to add user to organization')
      }

      console.log('✅ Successfully added to organization via SECURITY DEFINER function')

      // Step 2: Update invitation status
      const { error: inviteUpdateError } = await supabase
        .from('invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invite.id)

      if (inviteUpdateError) {
        console.error('⚠️ Could not update invitation:', inviteUpdateError)
      }

      console.log('✅ Invitation marked as accepted')

      // Step 3: Update user's current organization AND legacy fields
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ 
          current_organization_id: invite.organization_id,
          organization_id: invite.organization_id,
          role: invite.role
        })
        .eq('id', userId)

      if (userUpdateError) {
        console.error('⚠️ Could not update user current org:', userUpdateError)
      }

      console.log('✅ User current_organization_id updated')
      console.log('🎉 Invitation acceptance complete!')

      setSuccess(true)
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...')
        window.location.href = '/dashboard'
      }, 2000)
      
    } catch (err: any) {
      console.error('❌ Error accepting invitation:', err)
      setError(`Failed to accept invitation: ${err.message}`)
      setLoading(false)
    }
  }

  async function handleSignup() {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!formData.name.trim()) {
      setError('Please enter your name')
      return
    }

    setProcessing(true)
    setError('')

    const supabase = createClient()

    try {
      // Sign up new user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          }
        }
      })

      if (signupError) throw signupError

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          organization_id: invitation.organization_id,
          current_organization_id: invitation.organization_id,
          role: invitation.role,
          is_active: true,
          password_hash: 'supabase_auth'
        })

      if (userError) {
        console.error('Error creating user record:', userError)
      }

      // Use SECURITY DEFINER function to add to organization
      const { data: addResult, error: addError } = await supabase
        .rpc('add_user_to_organization', {
          target_user_id: authData.user.id,
          target_org_id: invitation.organization_id,
          user_role: invitation.role
        })

      if (addError) {
        console.error('Error calling add_user_to_organization:', addError)
      }

      // Update invitation status
      await supabase
        .from('invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      setSuccess(true)
      
      // Check if email confirmation is required
      if (authData.user.identities && authData.user.identities.length > 0) {
        setTimeout(() => {
          alert('📧 Confirmation email sent! Please check your inbox and click the verification link.')
          router.push('/login')
        }, 1000)
      } else {
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      }

    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Failed to create account')
      setProcessing(false)
    }
  }

  async function handleLogin() {
    if (!formData.password) {
      setError('Please enter your password')
      return
    }

    setProcessing(true)
    setError('')

    const supabase = createClient()

    try {
      // Login
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (loginError) throw loginError

      if (!authData.user) {
        throw new Error('Login failed')
      }

      // ✅ Verify email matches before accepting
      if (authData.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error('This invitation is for a different email address')
      }

      // Accept invitation for this user
      await acceptInvitationForExistingUser(authData.user.id, invitation)

    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid password')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (wrongAccountWarning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-orange-200">
          <CardHeader className="text-center">
            <AlertTriangle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <CardTitle className="text-orange-600">Wrong Account</CardTitle>
            <CardDescription className="text-left mt-4">
              {wrongAccountWarning}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full" 
              variant="default"
              onClick={handleLogout}
            >
              Logout & Accept Invitation
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-green-200">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">🎉 Invitation Accepted!</CardTitle>
            <CardDescription>
              You've been added to {invitation.organization?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-slate-600">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loginMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl">OffboardPro</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Login to Accept Invitation</h1>
            <p className="text-slate-600 mt-2">
              To {invitation.organization?.name} as {invitation.role}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enter Your Password</CardTitle>
              <CardDescription>
                Account already exists for {formData.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={processing}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>

                <Button 
                  onClick={handleLogin} 
                  className="w-full"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login & Accept Invitation'
                  )}
                </Button>

                <div className="text-center text-sm">
                  <button
                    onClick={() => setLoginMode(false)}
                    className="text-blue-600 hover:underline"
                    disabled={processing}
                  >
                    Back to signup
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl">OffboardPro</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">You're Invited!</h1>
          <p className="text-slate-600 mt-2">
            Join {invitation?.organization?.name} as {invitation?.role}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Fill in your details to accept the invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  disabled={processing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  disabled={processing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repeat password"
                  disabled={processing}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                />
              </div>

              <Button 
                onClick={handleSignup} 
                className="w-full"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Join'
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-slate-600">Already have an account? </span>
                <button
                  onClick={() => setLoginMode(true)}
                  className="text-blue-600 hover:underline font-medium"
                  disabled={processing}
                >
                  Login instead
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
