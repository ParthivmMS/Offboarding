import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { organizationName, name, email, password } = await request.json()

    // Validate input
    if (!organizationName || !name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Create Supabase client for API route
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Step 1: Create Supabase Auth user FIRST
    // This triggers handle_new_user() which creates the public.users record
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name, // This gets passed to trigger as raw_user_meta_data
        },
      },
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Step 2: Create organization using SECURITY DEFINER function
    // This bypasses RLS since it's called with elevated privileges
    const { data: organization, error: orgError } = await supabase.rpc(
      'create_organization_with_admin',
      {
        org_name: organizationName,
        admin_user_id: userId,
      }
    )

    if (orgError) {
      console.error('Organization creation error:', orgError)
      
      // Cleanup: Delete auth user if org creation fails
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabaseAdmin.auth.admin.deleteUser(userId)
      
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // Step 3: Get the created user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('User fetch error:', userError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: authData.user.email,
        name: name,
        role: 'admin',
        organization_id: organization?.id,
        current_organization_id: organization?.id,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
