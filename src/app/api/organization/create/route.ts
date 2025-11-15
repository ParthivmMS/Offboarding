import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Create organization
    const { data: orgResult, error: orgError } = await supabaseAdmin.rpc(
      'create_organization_with_admin',
      {
        org_name: organizationName,
        creator_user_id: userId,
      }
    )

    if (orgError || !orgResult || orgResult.length === 0 || !orgResult[0].success) {
      const errorMsg = orgError?.message || orgResult?.[0]?.error_message || 'Failed to create organization'
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    // Activate user
    await supabaseAdmin
      .from('users')
      .update({ is_active: true })
      .eq('id', userId)

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
