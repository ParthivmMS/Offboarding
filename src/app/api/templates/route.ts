import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    // Get both default and custom templates
    const { data: templates, error } = await supabase
      .from('templates')
      .select(`
        *,
        template_tasks(count)
      `)
      .or(`organization_id.is.null,organization_id.eq.${userData?.organization_id}`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Format response
    const formattedTemplates = templates?.map(t => ({
      ...t,
      task_count: t.template_tasks?.[0]?.count || 0,
    }))

    return NextResponse.json({ templates: formattedTemplates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
