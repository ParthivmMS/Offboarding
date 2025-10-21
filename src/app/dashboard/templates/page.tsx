import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'

export default async function TemplatesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id)
    .single()

  // Get default templates (organization_id is null)
  const { data: defaultTemplates } = await supabase
    .from('templates')
    .select('*, template_tasks(count)')
    .is('organization_id', null)
    .eq('is_active', true)

  // Get custom templates for this organization
  const { data: customTemplates } = await supabase
    .from('templates')
    .select('*, template_tasks(count)')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
          <p className="text-slate-600 mt-1">Manage offboarding checklists for different roles</p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Default Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Default Templates</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {defaultTemplates?.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <Badge variant="secondary">Default</Badge>
                </div>
                <CardTitle className="mt-4">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    {template.template_tasks?.[0]?.count || 0} tasks
                  </div>
                  <Link href={`/dashboard/templates/${template.id}`}>
                    <Button variant="ghost" size="sm">View Details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Custom Templates</h2>
        {customTemplates && customTemplates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="w-8 h-8 text-green-600" />
                    <Badge>Custom</Badge>
                  </div>
                  <CardTitle className="mt-4">{template.name}</CardTitle>
                  <CardDescription>{template.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      {template.template_tasks?.[0]?.count || 0} tasks
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/templates/${template.id}/edit`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                      <Link href={`/dashboard/templates/${template.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">No custom templates yet</p>
              <Link href="/dashboard/templates/new">
                <Button>Create Your First Template</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
