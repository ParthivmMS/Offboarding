'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Mail, User, Shield, Trash2, UserMinus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import InviteUserModal from '@/components/dashboard/InviteUserModal'
import { getCurrentOrganization } from '@/lib/workspace'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  user_id: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  invited_by: string
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [currentOrgId, setCurrentOrgId] = useState<string>('')
  const [currentOrgName, setCurrentOrgName] = useState<string>('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadTeamData()
  }, [])

  async function loadTeamData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get current organization from workspace utility
      const { organization, role } = await getCurrentOrganization()
      
      if (!organization) {
        console.error('No current organization')
        setLoading(false)
        return
      }

      setCurrentOrgId(organization.id)
      setCurrentOrgName(organization.name)
      setCurrentUserRole(role || '')

      // Get current user data
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      setCurrentUser(userData)

      // Get all team members from organization_members
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          is_active,
          joined_at,
          users!inner(
            id,
            name,
            email,
            created_at
          )
        `)
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })

      if (membersError) {
        console.error('Error fetching members:', membersError)
      } else if (members) {
        // Transform the data to match TeamMember interface
        const transformedMembers = members.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          name: m.users.name,
          email: m.users.email,
          role: m.role,
          is_active: m.is_active,
          created_at: m.users.created_at
        }))
        setTeamMembers(transformedMembers)
      }

      // Get pending invitations
      const { data: invites } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invites) {
        setInvitations(invites)
      }
    } catch (error) {
      console.error('Error loading team data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function removeMember(memberId: string, memberEmail: string) {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return
    }

    try {
      // Deactivate the membership instead of deleting
      const { error } = await supabase
        .from('organization_members')
        .update({ is_active: false })
        .eq('id', memberId)

      if (error) throw error

      alert('Member removed successfully')
      loadTeamData()
    } catch (error: any) {
      console.error('Error removing member:', error)
      alert(`Failed to remove member: ${error.message}`)
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)

      if (error) throw error

      alert('Invitation cancelled successfully')
      loadTeamData()
    } catch (error: any) {
      console.error('Error cancelling invitation:', error)
      alert(`Failed to cancel invitation: ${error.message}`)
    }
  }

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'admin':
        return 'bg-purple-500 text-white'
      case 'hr_manager':
        return 'bg-blue-500 text-white'
      case 'it_manager':
        return 'bg-green-500 text-white'
      case 'manager':
        return 'bg-orange-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  function formatRole(role: string) {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function canInviteUsers() {
    return ['admin', 'hr_manager'].includes(currentUserRole)
  }

  function canRemoveMembers() {
    return currentUserRole === 'admin'
  }

  function getRoleDescription(role: string) {
    switch (role) {
      case 'admin':
        return 'Full access to all features'
      case 'hr_manager':
        return 'Can manage offboardings and invite users'
      case 'it_manager':
        return 'Can manage IT-related tasks'
      case 'manager':
        return 'Can view and manage team offboardings'
      default:
        return 'Can view and complete assigned tasks'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600 mt-1">
            Manage {currentOrgName}'s team members and invitations
          </p>
        </div>
        {canInviteUsers() && (
          <Button onClick={() => setShowInviteModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* Current User Info */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">You are signed in as</p>
              <p className="font-bold text-lg text-gray-900">{currentUser?.name}</p>
              <p className="text-sm text-gray-600">{currentUser?.email}</p>
            </div>
            <div>
              <Badge className={`${getRoleBadgeColor(currentUserRole)} px-4 py-2 text-sm`}>
                {formatRole(currentUserRole)}
              </Badge>
              <p className="text-xs text-gray-600 mt-2 text-right">
                {getRoleDescription(currentUserRole)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Purpose Explanation */}
      <Card className="mb-6 border-2 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Shield className="w-5 h-5" />
            What are Team Members for?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-amber-900">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Collaboration:</strong> Multiple people can work on offboarding tasks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Role-based Access:</strong> Control who can create offboardings vs just complete tasks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Department Separation:</strong> IT Managers handle IT tasks, HR handles HR tasks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Visibility:</strong> Everyone in the organization can see progress and status</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Active Team Members */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Active Members ({teamMembers.length})
          </CardTitle>
          <CardDescription>
            Team members with active accounts in {currentOrgName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No active team members
            </p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-3">
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {formatRole(member.role)}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Joined {formatDate(member.created_at)}
                      </p>
                    </div>
                    {canRemoveMembers() && member.user_id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id, member.email)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canInviteUsers() && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>
              Users who have been invited but haven't accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map(invite => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border border-dashed rounded-lg bg-yellow-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{invite.email}</div>
                      <div className="text-sm text-gray-600">
                        Invited {formatDate(invite.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getRoleBadgeColor(invite.role)}>
                      {formatRole(invite.role)}
                    </Badge>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      Pending
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInvitation(invite.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Cancel invitation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            loadTeamData()
          }}
        />
      )}
    </div>
  )
}
