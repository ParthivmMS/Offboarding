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

      // Get user's current organization directly (should work with existing policies)
      const { data: userData } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()

      // Get memberships
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('id, role, organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (memberships && memberships.length > 0) {
        // Get org details
        const orgIds = memberships.map(m => m.organization_id)
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds)

        if (orgs) {
          const fullMemberships = memberships.map(m => ({
            id: m.id,
            role: m.role,
            organization: orgs.find(o => o.id === m.organization_id) || { id: m.organization_id, name: 'Unknown' }
          }))
          
          setOrganizations(fullMemberships)

          // Set current org
          if (userData?.current_organization_id) {
            const current = fullMemberships.find(m => m.organization.id === userData.current_organization_id)
            if (current) {
              setCurrentOrg(current.organization)
            }
          }
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

      // Use the SECURITY DEFINER function
      const { error } = await supabase.rpc('switch_user_organization', {
        new_org_id: orgId
      })

      if (error) throw error

      // Reload page
      window.location.href = '/dashboard'
    } catch (error: any) {
      console.error('Error switching organization:', error)
      alert('Failed to switch organization: ' + error.message)
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
      window.location.href = '/dashboard'
    } else {
      alert('Failed to create organization')
      setCreating(false)
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
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(membership.role)}`}>
                      {formatRole(membership.role)}
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
