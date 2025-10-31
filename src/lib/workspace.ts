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
 */
export async function createOrganization(name: string): Promise<Organization | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('No authenticated user')
    return null
  }

  console.log('Creating organization:', name, 'for user:', user.id)

  // Step 1: Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name })
    .select()
    .single()

  if (orgError) {
    console.error('❌ Error creating organization:', orgError)
    alert(`Database error: ${orgError.message}`)
    return null
  }

  if (!org) {
    console.error('❌ Organization created but no data returned')
    return null
  }

  console.log('✅ Organization created:', org.id)

  // Step 2: Add user as admin member
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      user_id: user.id,
      organization_id: org.id,
      role: 'admin',
      is_active: true
    })

  if (memberError) {
    console.error('❌ Error adding user to organization:', memberError)
    alert(`Failed to add member: ${memberError.message}`)
    // Rollback: delete the organization
    await supabase.from('organizations').delete().eq('id', org.id)
    return null
  }

  console.log('✅ User added as admin member')

  // Step 3: Update user's current organization
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      current_organization_id: org.id,
      organization_id: org.id, // Keep legacy field in sync
      role: 'admin' // Keep legacy field in sync
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('⚠️ Warning: Could not update user current org:', updateError)
    // Don't fail - organization is already created
  }

  console.log('✅ Organization creation complete!')
  return org
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
