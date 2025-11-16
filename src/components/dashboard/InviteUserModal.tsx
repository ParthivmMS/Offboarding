'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Crown, AlertTriangle } from 'lucide-react'
import { getCurrentOrganization } from '@/lib/workspace'
import { trackInviteSent } from '@/lib/analytics'
import { canInviteMoreMembers, getPlanLimits, getRemainingMemberSlots } from '@/lib/subscription'

interface InviteUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function InviteUserModal({ onClose, onSuccess }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [userPlan, setUserPlan] = useState<string>('starter')
  const supabase = createClient()

  // Load member count and plan on mount
  useState(() => {
    loadTeamInfo()
  })

  async function loadTeamInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's plan
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', user.id)
        .single()

      if (userData?.subscription_plan) {
        setUserPlan(userData.subscription_plan)
      }

      // Get current organization
      const { organization } = await getCurrentOrganization()
      if (!organization) return

      // Count members
      const { count } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true)

      if (count !== null) {
        setMemberCount(count)
      }
    } catch (err) {
      console.error('Error loading team info:', err)
    }
  }

  async function handleInvite() {
    setError('')
    
    // Validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (!role) {
      setError('Please select a role')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Get current organization using workspace utility
      const { organization, role: userRole } = await getCurrentOrganization()
      
      if (!organization) {
        setError('No active organization')
        setLoading(false)
        return
      }

      // Check if user can invite
      if (!['admin', 'hr_manager'].includes(userRole || '')) {
        setError('You do not have permission to invite users')
        setLoading(false)
        return
      }

      // 🆕 GET USER'S SUBSCRIPTION INFO
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_plan, subscription_status, name')
        .eq('id', user.id)
        .single()
      
      const currentPlan = userData?.subscription_plan || 'starter'
      const subscriptionStatus = userData?.subscription_status

      // 🆕 COUNT CURRENT TEAM MEMBERS
      const { count: currentMemberCount, error: countError } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true)

      if (countError) {
        console.error('❌ Error counting members:', countError)
        setError('Failed to check team size')
        setLoading(false)
        return
      }

      console.log('📊 Team size check:', {
        currentMembers: currentMemberCount,
        plan: currentPlan,
        subscriptionStatus
      })

      // 🆕 CHECK SUBSCRIPTION LIMITS
      const canInvite = canInviteMoreMembers(currentMemberCount || 0, currentPlan)
      
      if (!canInvite) {
        const limits = getPlanLimits(currentPlan)
        
        setError(
          `Team member limit reached! Your ${limits.name} plan allows ${limits.maxTeamMembers} members. You currently have ${currentMemberCount}. Please upgrade to add more team members.`
        )
        
        setLoading(false)
        return
      }

      // 🆕 SHOW WARNING IF APPROACHING LIMIT
      const remaining = getRemainingMemberSlots(currentMemberCount || 0, currentPlan)
      if (remaining !== Infinity && remaining <= 3) {
        console.log(`⚠️ Only ${remaining} member slots remaining on ${currentPlan} plan`)
      }

      console.log('📧 Inviting user to organization:', organization.name, organization.id)

      // Check if user already exists in organization
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id, users!inner(email)')
        .eq('organization_id', organization.id)
        .eq('is_active', true)

      const alreadyMember = existingMember?.some(
        (m: any) => m.users?.email?.toLowerCase() === email.toLowerCase()
      )

      if (alreadyMember) {
        setError('This user is already a member of your organization')
        setLoading(false)
        return
      }

      console.log('🔑 Calling database function to create invitation...')

      // Call database function to create invitation (bypasses RLS!)
      const { data: inviteResult, error: inviteError } = await supabase.rpc('send_team_invitation', {
        invite_email: email.toLowerCase(),
        invite_role: role,
        invite_org_id: organization.id
      })

      if (inviteError) {
        console.error('❌ Error calling function:', inviteError)
        throw inviteError
      }

      if (!inviteResult || inviteResult.length === 0 || !inviteResult[0].success) {
        const errorMsg = inviteResult?.[0]?.error_message || 'Unknown error'
        console.error('❌ Function returned error:', errorMsg)
        throw new Error(errorMsg)
      }

      const token = inviteResult[0].token
      console.log('✅ Invitation created with token:', token.substring(0, 10) + '...')

      // Generate invitation link
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'https://offboarding.vercel.app')
      const inviteLink = `${appUrl}/accept-invite?token=${token}`
      
      console.log('🔗 Invitation link:', inviteLink)
      
      // Send invitation email
      console.log('📧 Sending invitation email to:', email)
      
      const emailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'team_invitation',
          to: [email],
          inviterName: userData?.name || 'A team member',
          organizationName: organization.name,
          role: formatRole(role),
          inviteLink,
        }),
      })

      const emailResult = await emailResponse.json()
      console.log('📬 Email result:', emailResult)

      if (!emailResponse.ok) {
        console.error('❌ Email sending failed:', emailResult)
        // Don't fail - invitation is still created
      } else {
        console.log('✅ Email sent successfully!')
      }

      // 🎉 TRACK INVITE EVENT
      trackInviteSent(role)
      console.log('📊 Tracked invite event:', role)

      // 🆕 SUCCESS MESSAGE WITH REMAINING SLOTS INFO
      const newRemaining = getRemainingMemberSlots((currentMemberCount || 0) + 1, currentPlan)
      let successMessage = `✅ Invitation sent to ${email}!`
      
      if (newRemaining !== Infinity && newRemaining <= 5) {
        successMessage += `\n\n💡 You have ${newRemaining} member slot${newRemaining === 1 ? '' : 's'} remaining on your ${currentPlan} plan.`
        
        if (newRemaining <= 2) {
          successMessage += ` Consider upgrading soon!`
        }
      }
      
      alert(successMessage)
      onSuccess()
    } catch (error: any) {
      console.error('❌ Error sending invitation:', error)
      setError(`Failed to send invitation: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function formatRole(role: string) {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Calculate remaining slots for display
  const limits = getPlanLimits(userPlan)
  const remaining = memberCount !== null 
    ? getRemainingMemberSlots(memberCount, userPlan)
    : null
  const isApproachingLimit = remaining !== null && remaining !== Infinity && remaining <= 5

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 🆕 SHOW LIMIT WARNING IF APPROACHING */}
          {isApproachingLimit && remaining !== null && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">
                  {remaining} member slot{remaining === 1 ? '' : 's'} remaining
                </p>
                <p className="text-amber-700 mt-1">
                  Your {limits.name} plan allows {limits.maxTeamMembers} members.
                  {remaining <= 2 && (
                    <button
                      onClick={() => window.open('/pricing', '_blank')}
                      className="text-amber-900 underline ml-1 font-medium hover:text-amber-800"
                    >
                      Upgrade now
                    </button>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium">{error}</p>
              {error.includes('limit reached') && (
                <button
                  onClick={() => window.open('/pricing', '_blank')}
                  className="mt-2 text-sm underline font-medium hover:text-red-800 flex items-center gap-1"
                >
                  <Crown className="w-3 h-3" />
                  View Upgrade Options
                </button>
              )}
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Role Select */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="it_manager">IT Manager</SelectItem>
                <SelectItem value="hr_manager">HR Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              {role === 'admin' && 'Full access to all features'}
              {role === 'hr_manager' && 'Can manage offboardings and team'}
              {role === 'it_manager' && 'Can manage IT-related tasks'}
              {role === 'manager' && 'Can view and manage team offboardings'}
              {role === 'user' && 'Can view and complete assigned tasks'}
            </p>
          </div>

          {/* 🆕 PLAN INFO */}
          {memberCount !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-900 font-medium">
                  Team Size: {memberCount} / {limits.maxTeamMembers === Infinity ? '∞' : limits.maxTeamMembers}
                </span>
                <span className="text-blue-700 text-xs">
                  {limits.name} Plan
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
                              }
