'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Mail, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import InviteUserModal from '@/components/dashboard/InviteUserModal'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
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
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
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

      // Get current user's data
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, role')
        .eq('id', user.id)
        .maybeSingle()

      if (!userData) {
        setLoading(false)
        return
      }

      setCurrentUserRole(userData.role)

      // Get all team members in organization
      const { data: members } = await supabase
        .from('users')
        .select('id, name, email, role, is_active, created_at')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false })

      if (members) {
        setTeamMembers(members)
      }

      // Get pending invitations
      const { data: invites } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', userData.organization_id)
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
            Manage your organization's team members and invitations
          </p>
        </div>
        {canInviteUsers() && (
          <Button onClick={() => setShowInviteModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* Active Team Members */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Active Members ({teamMembers.filter(m => m.is_active).length})
          </CardTitle>
          <CardDescription>
            Team members with active accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.filter(m => m.is_active).length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No active team members
            </p>
          ) : (
            <div className="space-y-3">
              {teamMembers.filter(m => m.is_active).map(member => (
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
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {formatRole(member.role)}
                    </Badge>
                    <div className="text-sm text-gray-500">
                      Joined {formatDate(member.created_at)}
                    </div>
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
