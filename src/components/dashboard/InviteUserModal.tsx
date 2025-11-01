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
import { Loader2 } from 'lucide-react'
import { getCurrentOrganization } from '@/lib/workspace'

interface InviteUserModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function InviteUserModal({ onClose, onSuccess }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

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

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('organization_id', organization.id)
        .eq('status', 'pending')
        .maybeSingle()

      // Delete old invitation if exists
      if (existingInvite) {
        await supabase
          .from('invitations')
          .delete()
          .eq('id', existingInvite.id)
        
        console.log('🗑️ Deleted old invitation')
      }

      // Generate secure token
      const token = generateSecureToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

      console.log('🔑 Generated token:', token.substring(0, 10) + '...')

      // Create invitation
      const { data: newInvite, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          organization_id: organization.id,
          email: email.toLowerCase(),
          role,
          token,
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .select()
        .single()

      if (inviteError) {
        console.error('❌ Error creating invitation:', inviteError)
        throw inviteError
      }

      console.log('✅ Invitation created:', newInvite.id)

      // Get current user name
      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()

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

      alert(`✅ Invitation sent to ${email}!`)
      onSuccess()
    } catch (error: any) {
      console.error('❌ Error sending invitation:', error)
      setError(`Failed to send invitation: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function generateSecureToken() {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  function formatRole(role: string) {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

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
