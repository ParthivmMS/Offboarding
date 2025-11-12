'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Mail, User, Shield, Trash2, UserMinus, Users, RefreshCw, AlertCircle, UserPlus, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import InviteUserModal from '@/components/dashboard/InviteUserModal'

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
  inviter?: {
    name: string
    email: string
  }
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [currentOrgId, setCurrentOrgId] = useState<string>('')
  const [currentOrgName, setCurrentOrgName] = useState<string>('Your Organization')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadTeamData()
  }, [])

  async function loadTeamData() {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      // Get current user data FIRST
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle()

      if (userError || !userData?.current_organization_id) {
        setError('No organization found. Please create or join an organization.')
        setLoading(false)
        return
      }

      const orgId = userData.current_organization_id

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', orgId)
        .maybeSingle()

      if (orgError || !orgData) {
        setError('Could not load organization details.')
        setLoading(false)
        return
      }

      setCurrentOrgId(orgData.id)
      setCurrentOrgName(orgData.name)

      // Get user's role
      const { data: membershipData } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .maybeSingle()

      setCurrentUserRole(membershipData?.role || '')
      setCurrentUser({ id: user.id, name: user.email, email: user.email })

      // Get all team members with a single JOIN query
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          is_active,
          joined_at,
          users (
            id,
            name,
            email,
            created_at
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })

      console.log('👥 Raw members data:', members)
      console.log('❌ Members error:', membersError)

      if (membersError) {
        throw membersError
      }

      if (members && members.length > 0) {
        const transformedMembers = members.map((m: any) => {
          console.log('Processing member:', m)
          return {
            id: m.id,
            user_id: m.user_id,
            name: m.users?.name || m.users?.email?.split('@')[0] || 'Unknown User',
            email: m.users?.email || 'unknown@email.com',
            role: m.role,
            is_active: m.is_active,
            created_at: m.users?.created_at || m.joined_at
          }
        })
        
        console.log('✅ Transformed members:', transformedMembers)
        setTeamMembers(transformedMembers)
      }

      // Get pending invitations
      const { data: invites } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:users!invitations_invited_by_fkey(name, email)
        `)
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invites) {
        setInvitations(invites)
      }
    } catch (error: any) {
      console.error('Error loading team data:', error)
      setError(error.message || 'Failed to load team data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function removeMember(memberId: string, memberEmail: string) {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ is_active: false })
        .eq('id', memberId)

      if (error) throw error

      alert('✅ Member removed successfully')
      loadTeamData()
    } catch (error: any) {
      console.error('Error removing member:', error)
      alert(`❌ Failed to remove member: ${error.message}`)
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

      alert('✅ Invitation cancelled successfully')
      loadTeamData()
    } catch (error: any) {
      console.error('Error cancelling invitation:', error)
      alert(`❌ Failed to cancel invitation: ${error.message}`)
    }
  }

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'admin':
        return 'bg-purple-500 text-white hover:bg-purple-600'
      case 'hr_manager':
        return 'bg-blue-500 text-white hover:bg-blue-600'
      case 'it_manager':
        return 'bg-green-500 text-white hover:bg-green-600'
      case 'manager':
        return 'bg-orange-500 text-white hover:bg-orange-600'
      default:
        return 'bg-gray-500 text-white hover:bg-gray-600'
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

  // 🎨 Loading State with Skeleton
  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-9 w-48 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-80 bg-slate-100 rounded mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded animate-pulse"></div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-slate-200 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-3 w-48 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ❌ Error State
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-600 mt-1">Manage your team members and invitations</p>
          </div>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Team</h3>
            <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={loadTeamData} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
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
          <Button 
            onClick={() => setShowInviteModal(true)} 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Current User Info */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">You are signed in as</p>
              <p className="font-bold text-lg text-gray-900">{currentUser?.name || currentUser?.email}</p>
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
      <Card className="mb-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Shield className="w-5 h-5" />
            Why Add Team Members?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-amber-800" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 mb-1">Collaboration</p>
                <p className="text-sm text-amber-800">Multiple people can work on offboarding tasks together</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-amber-800" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 mb-1">Role-based Access</p>
                <p className="text-sm text-amber-800">Control who can create offboardings vs complete tasks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserPlus className="w-4 h-4 text-amber-800" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 mb-1">Department Separation</p>
                <p className="text-sm text-amber-800">IT, HR, and other teams handle their specific tasks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-amber-800" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 mb-1">Visibility</p>
                <p className="text-sm text-amber-800">Everyone sees progress and stays aligned</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Team Members */}
      <Card className="mb-6 border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Active Members ({teamMembers.length})
          </CardTitle>
          <CardDescription>
            Team members with active accounts in {currentOrgName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Team Members Yet</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                You're the only member. Invite others to collaborate on offboardings.
              </p>
              {canInviteUsers() && (
                <Button onClick={() => setShowInviteModal(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite First Team Member
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md hover:border-blue-200 transition-all"
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
      {canInviteUsers() && (
        <Card className="border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-yellow-600" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>
              Users who have been invited but haven't accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 text-sm">No pending invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map(invite => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 border border-dashed rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{invite.email}</div>
                        <div className="text-sm text-gray-600">
                          Invited by {invite.inviter?.name || 'Unknown'} on {formatDate(invite.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleBadgeColor(invite.role)}>
                        {formatRole(invite.role)}
                      </Badge>
                      <Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-100">
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
            )}
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
