'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  getUserOrganizations,
  getCurrentOrganization,
  switchOrganization,
  createOrganization,
  type Organization,
  type OrganizationMembership
} from '@/lib/workspace'

export default function OrganizationSwitcher() {
  const router = useRouter()
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
    setLoading(true)
    const [current, orgs] = await Promise.all([
      getCurrentOrganization(),
      getUserOrganizations()
    ])
    
    setCurrentOrg(current.organization)
    setOrganizations(orgs)
    setLoading(false)
  }

  async function handleSwitchOrganization(orgId: string) {
    if (orgId === currentOrg?.id) return

    setSwitching(true)
    const success = await switchOrganization(orgId)
    
    if (success) {
      // Reload the page to refresh all data with new organization context
      window.location.href = '/dashboard'
    } else {
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
            const org = membership.organization as Organization
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
