'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building, Check, ChevronDown, Loader2 } from 'lucide-react'

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
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    loadOrganizations()
  }, [])

  async function loadOrganizations() {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use SECURITY DEFINER function to get user data (bypasses RLS)
      const { data: userDataArray } = await supabase.rpc('get_current_user_org')
      const userData = userDataArray?.[0]

      console.log('🔍 User data:', userData)

      // Get all memberships with organization details in one query
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('id, role, organization_id, organizations(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      console.log('👥 Memberships:', memberships)

      if (memberships && memberships.length > 0) {
        const fullMemberships = memberships.map((m: any) => ({
          id: m.id,
          role: m.role,
          organization: m.organizations || { id: m.organization_id, name: 'Unknown' }
        }))
        
        setOrganizations(fullMemberships)

        // Set current org from user data or first membership
        if (userData?.current_org_id) {
          const current = fullMemberships.find((m: any) => m.organization.id === userData.current_org_id)
          if (current) {
            setCurrentOrg(current.organization)
          }
        } else if (fullMemberships.length > 0) {
          // Fallback to first org
          setCurrentOrg(fullMemberships[0].organization)
        }
      }
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwitchOrganization(orgId: string) {
    if (orgId === currentOrg?.id) return

    try {
      setSwitching(true)
      
      // Call SECURITY DEFINER function
      const { error } = await supabase.rpc('switch_user_organization', {
        new_org_id: orgId
      })

      if (error) {
        alert('Failed to switch: ' + error.message)
        setSwitching(false)
        return
      }

      // Success! Reload immediately
      window.location.href = '/dashboard?t=' + Date.now()
    } catch (error: any) {
      alert('Error: ' + error.message)
      setSwitching(false)
    }
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
                  <span className="text-xs text-gray-500">{membership.role}</span>
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
            <p className="text-sm text-gray-500">No organizations found</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
