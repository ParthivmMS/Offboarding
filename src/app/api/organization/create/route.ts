import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { organizationName, userId } = await request.json()

    if (!organizationName || !userId) {
      return NextResponse.json(
        { error: 'Organization name and user ID required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify user exists and doesn't already have an org
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('organization_id, current_organization_id')
      .eq('id', userId)
      .single()

    if (existingUser?.organization_id) {
      return NextResponse.json(
        { error: 'User already has an organization' },
        { status: 400 }
      )
    }

    // Create organization using the database function
    const { data: orgResult, error: orgError } = await supabaseAdmin.rpc(
      'create_organization_with_admin',
      {
        org_name: organizationName,
        creator_user_id: userId,
      }
    )

    if (orgError || !orgResult || orgResult.length === 0 || !orgResult[0].success) {
      const errorMsg = orgError?.message || orgResult?.[0]?.error_message || 'Failed to create organization'
      console.error('Organization creation error:', errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    // Activate user now that they have an organization
    await supabaseAdmin
      .from('users')
      .update({ is_active: true })
      .eq('id', userId)

    console.log('✅ Organization created:', orgResult[0].organization_name, 'for user:', userId)

    return NextResponse.json({
      success: true,
      organization: {
        id: orgResult[0].organization_id,
        name: orgResult[0].organization_name,
      },
    })
  } catch (error) {
    console.error('Org creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
