'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building, Check, ChevronDown, Plus, Loader2 } from 'lucide-react'
import { createOrganization } from '@/lib/workspace'

interface Organization {
  id: string
  name: string
}

interface OrganizationMembership {
  id: string
  role: string
  organization: Organization
}

export default function OrganizationSwitcher() {
  const router = useRouter()
  const supabase = createClient()
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [creating, setCreating] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    loadOrganizations()
  }, [])

  async function loadOrganizations() {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('❌ No authenticated user')
        return
      }

      console.log('✅ User ID:', user.id)

      // Get current organization ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle()

      console.log('📊 User data:', userData)
      console.log('❌ User error:', userError)

      if (userData?.current_organization_id) {
        // Get current organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', userData.current_organization_id)
          .maybeSingle()

        console.log('🏢 Current org data:', orgData)
        console.log('❌ Org error:', orgError)

        if (orgData) {
          setCurrentOrg(orgData)
        }
      }

      // Get all organizations user is member of
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select('id, role, organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })

      console.log('👥 Memberships:', memberships)
      console.log('❌ Member error:', memberError)

      if (memberships && memberships.length > 0) {
        // Fetch organization details for each membership
        const orgIds = memberships.map(m => m.organization_id)
        console.log('🔑 Org IDs to fetch:', orgIds)
        
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds)

        console.log('🏢 Organizations fetched:', orgs)
        console.log('❌ Orgs error:', orgsError)

        if (orgs) {
          // Combine membership and organization data
          const fullMemberships = memberships.map(m => ({
            id: m.id,
            role: m.role,
            organization: orgs.find(o => o.id === m.organization_id) || { id: m.organization_id, name: 'Unknown' }
          }))
          
          console.log('✅ Final memberships:', fullMemberships)
          setOrganizations(fullMemberships)
        }
      } else {
        console.log('⚠️ No memberships found')
      }
    } catch (error) {
      console.error('💥 Error loading organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwitchOrganization(orgId: string) {
    if (orgId === currentOrg?.id) {
      alert('⚠️ Already on this organization')
      return
    }

    try {
      alert('🔄 Step 1: Starting switch to org ID: ' + orgId.substring(0, 8) + '...')
      setSwitching(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('❌ Step 2 FAILED: No user found in session!')
        setSwitching(false)
        return
      }
      
      alert('✅ Step 2: User found: ' + user.id.substring(0, 8) + '...')

      // Verify user is member of this organization
      console.log('🔍 Checking membership for user:', user.id, 'org:', orgId)
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .maybeSingle()

      console.log('👥 Membership result:', membership)
      console.log('❌ Membership error:', memberError)

      if (memberError) {
        alert('❌ Step 3 FAILED: Error checking membership: ' + JSON.stringify(memberError))
        setSwitching(false)
        return
      }

      if (!membership) {
        alert('❌ Step 3 FAILED: You are not a member of this organization')
        setSwitching(false)
        return
      }

      alert('✅ Step 3: Membership verified (ID: ' + membership.id.substring(0, 8) + '...)')

      // Update current organization
      console.log('📝 Updating current_organization_id to:', orgId)
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ current_organization_id: orgId })
        .eq('id', user.id)
        .select()

      console.log('📊 Update result:', updateData)
      console.log('❌ Update error:', updateError)

      if (updateError) {
        alert('❌ Step 4 FAILED: Database update error: ' + JSON.stringify(updateError))
        setSwitching(false)
        return
      }

      alert('✅ Step 4: Database updated successfully! Reloading page...')
      
      // Reload the page to refresh all data
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)
    } catch (error: any) {
      console.error('💥 Catch block error:', error)
      alert('❌ EXCEPTION: ' + (error?.message || JSON.stringify(error)))
      setSwitching(false)
    }
  }

  async function handleCreateOrganization() {
    if (!newOrgName.trim()) {
      alert('Please enter an organization name')
      return
    }

    setCreating(true)
    const newOrg = await createOrganization(newOrgName.trim())
    
    if (newOrg) {
      setShowCreateModal(false)
      setNewOrgName('')
      // Reload to show new organization
      window.location.href = '/dashboard'
    } else {
      alert('Failed to create organization')
      setCreating(false)
    }
  }

  function getRoleBadge(role: string) {
    const badges: Record<string, { color: string; label: string }> = {
      admin: { color: 'bg-purple-100 text-purple-700', label: 'Admin' },
      hr_manager: { color: 'bg-blue-100 text-blue-700', label: 'HR' },
      it_manager: { color: 'bg-green-100 text-green-700', label: 'IT' },
      manager: { color: 'bg-orange-100 text-orange-700', label: 'Manager' },
      user: { color: 'bg-gray-100 text-gray-700', label: 'User' }
    }
    return badges[role] || badges.user
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
        <Building className="w-4 h-4 text-gray-400 animate-pulse" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between hover:bg-gray-50"
            disabled={switching}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Building className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm font-medium">
                {switching ? 'Switching...' : currentOrg?.name || 'Select Organization'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-[280px]" align="start">
          <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
            Your Organizations
          </DropdownMenuLabel>

          {organizations.map((membership) => {
            const org = membership.organization
            const isActive = org.id === currentOrg?.id
            const badge = getRoleBadge(membership.role)

            return (
              <DropdownMenuItem
                key={membership.id}
                onClick={() => handleSwitchOrganization(org.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  <Building className="w-4 h-4 flex-shrink-0 text-gray-500" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{org.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
                {isActive && (
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            )
          })}

          {organizations.length === 0 && (
            <div className="px-2 py-6 text-center">
              <p className="text-sm text-gray-500 mb-2">No organizations yet</p>
              <p className="text-xs text-gray-400">Create your first organization to get started</p>
            </div>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 cursor-pointer text-blue-600"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create New Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Organization Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Start managing offboarding for a new company or team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                placeholder="e.g., Acme Corporation"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                disabled={creating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateOrganization()
                }}
              />
              <p className="text-xs text-gray-500">
                This is the company or team name that will appear in your workspace
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                setNewOrgName('')
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={creating || !newOrgName.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
                  }
