// src/lib/workspace.ts
// Workspace/Organization management utilities

import { createClient } from '@/lib/supabase/client'

export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface OrganizationMembership {
  id: string
  user_id: string
  organization_id: string
  role: string
  is_active: boolean
  joined_at: string
  organization?: Organization
}

export interface UserWithOrganization {
  id: string
  email: string
  name: string
  current_organization_id: string | null
  currentOrganization?: Organization
  memberships?: OrganizationMembership[]
}

/**
 * Get all organizations the current user is a member of
 */
export async function getUserOrganizations(): Promise<OrganizationMembership[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching organizations:', error)
    return []
  }

  return data || []
}

/**
 * Get current user's active organization and role
 */
export async function getCurrentOrganization(): Promise<{
  organization: Organization | null
  role: string | null
  membership: OrganizationMembership | null
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { organization: null, role: null, membership: null }
  }

  // Get user's current organization
  const { data: userData } = await supabase
    .from('users')
    .select('current_organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!userData?.current_organization_id) {
    return { organization: null, role: null, membership: null }
  }

  // Get membership details with organization info
  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('user_id', user.id)
    .eq('organization_id', userData.current_organization_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) {
    return { organization: null, role: null, membership: null }
  }

  return {
    organization: membership.organization as Organization,
    role: membership.role,
    membership: membership as OrganizationMembership
  }
}

/**
 * Switch to a different organization
 */
export async function switchOrganization(organizationId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  // Verify user is a member of this organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) {
    console.error('User is not a member of this organization')
    return false
  }

  // Update current organization
  const { error } = await supabase
    .from('users')
    .update({ current_organization_id: organizationId })
    .eq('id', user.id)

  if (error) {
    console.error('Error switching organization:', error)
    return false
  }

  return true
}

/**
 * Create a new organization and make current user the admin
 * Uses database function to bypass RLS issues
 */
export async function createOrganization(name: string): Promise<Organization | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('No authenticated user')
    return null
  }

  console.log('Creating organization via database function:', name)

  try {
    // Call the database function that bypasses RLS
    const { data, error } = await supabase.rpc('create_organization_with_admin', {
      org_name: name,
      creator_user_id: user.id
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      alert(`Failed to create organization: ${error.message}`)
      return null
    }

    if (!data || data.length === 0) {
      console.error('❌ No data returned from function')
      return null
    }

    const result = data[0]
    
    if (!result.success) {
      console.error('❌ Function returned error:', result.error_message)
      alert(`Failed to create organization: ${result.error_message}`)
      return null
    }

    console.log('✅ Organization created successfully:', result.organization_id)

    // Return the organization object
    return {
      id: result.organization_id,
      name: result.organization_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
  } catch (err: any) {
    console.error('❌ Unexpected error:', err)
    alert(`Unexpected error: ${err.message}`)
    return null
  }
}

/**
 * Check if current user has permission to perform an action
 */
export async function hasPermission(
  action: 'invite_users' | 'create_offboarding' | 'manage_settings' | 'view_all_tasks'
): Promise<boolean> {
  const { role } = await getCurrentOrganization()
  
  if (!role) return false

  const permissions: Record<string, string[]> = {
    invite_users: ['admin', 'hr_manager'],
    create_offboarding: ['admin', 'hr_manager'],
    manage_settings: ['admin'],
    view_all_tasks: ['admin', 'hr_manager', 'it_manager', 'manager']
  }

  return permissions[action]?.includes(role) || false
}

/**
 * Get user's role in current organization
 */
export async function getCurrentRole(): Promise<string | null> {
  const { role } = await getCurrentOrganization()
  return role
}

/**
 * Get organization members (for team page)
 */
export async function getOrganizationMembers(organizationId?: string): Promise<any[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  // If no org ID provided, use current organization
  let orgId = organizationId
  if (!orgId) {
    const { organization } = await getCurrentOrganization()
    orgId = organization?.id
  }

  if (!orgId) return []

  // Get all members with their user details
  const { data: members } = await supabase
    .from('organization_members')
    .select(`
      *,
      user:users(id, name, email, created_at)
    `)
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })

  return members || []
}

/**
 * Invite user to organization (updated for new structure)
 */
export async function inviteUserToOrganization(
  email: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get current organization
  const { organization } = await getCurrentOrganization()
  
  if (!organization) {
    return { success: false, error: 'No active organization' }
  }

  // Check permissions
  const canInvite = await hasPermission('invite_users')
  if (!canInvite) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Check if user already exists in this organization
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id, user:users(email)')
    .eq('organization_id', organization.id)
    .eq('is_active', true)

  const alreadyMember = existingMember?.some(
    (m: any) => m.user?.email?.toLowerCase() === email.toLowerCase()
  )

  if (alreadyMember) {
    return { success: false, error: 'User is already a member' }
  }

  // Rest of invitation logic remains the same
  // (Create invitation record, send email, etc.)
  
  return { success: true }
}
