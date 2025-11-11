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
      if (!user) return

      // Get current organization ID
      const { data: userData } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle()

      if (userData?.current_organization_id) {
        // Get current organization details
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', userData.current_organization_id)
          .maybeSingle()

        if (orgData) {
          setCurrentOrg(orgData)
        }
      }

      // Get all organizations user is member of
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('id, role, organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })

      if (memberships && memberships.length > 0) {
        // Fetch organization details for each membership
        const orgIds = memberships.map(m => m.organization_id)
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds)

        if (orgs) {
          // Combine membership and organization data
          const fullMemberships = memberships.map(m => ({
            id: m.id,
            role: m.role,
            organization: orgs.find(o => o.id === m.organization_id) || { id: m.organization_id, name: 'Unknown' }
          }))
          
          setOrganizations(fullMemberships)
        }
      }
    } catch (error) {
      console.error('Error loading organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwitchOrganization(orgId: string) {
    if (orgId === currentOrg?.id) return

    try {
      setSwitching(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Verify user is member of this organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .maybeSingle()

      if (!membership) {
        alert('You are not a member of this organization')
        setSwitching(false)
        return
      }

      // Update current organization
      const { error } = await supabase
        .from('users')
        .update({ current_organization_id: orgId })
        .eq('id', user.id)

      if (error) {
        alert('Failed to switch organization')
        setSwitching(false)
        return
      }

      // Reload the page to refresh all data
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Error switching organization:', error)
      alert('Failed to switch organization')
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
