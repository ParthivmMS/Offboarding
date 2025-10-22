import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OffboardingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user?.id)
    .single()

  // Get all offboardings with task progress
  const { data: offboardings } = await supabase
    .from('offboardings')
    .select(`
      *,
      tasks (
        id,
        completed
      )
    `)
    .eq('organization_id', userData?.organization_id)
    .order('created_at', { ascending: false })

  const calculateProgress = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return 0
    const completed = tasks.filter(t => t.completed).length
    return Math.round((completed / tasks.length) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Offboardings</h1>
          <p className="text-slate-600 mt-1">Manage employee exit processes</p>
        </div>
        <Link href="/dashboard/offboardings/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Offboarding
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by employee name..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Offboardings List */}
      <div className="space-y-4">
        {offboardings && offboardings.length > 0 ? (
          offboardings.map((offboarding) => {
            const progress = calculateProgress(offboarding.tasks)
            const completedTasks = offboarding.tasks.filter((t: any) => t.completed).length
            const totalTasks = offboarding.tasks.length

            return (
              <Link key={offboarding.id} href={`/dashboard/offboardings/${offboarding.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{offboarding.employee_name}</h3>
                          <Badge
                            className={
                              offboarding.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : offboarding.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }
                          >
                            {offboarding.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 mb-4">
                          <div>
                            <span className="text-slate-500">Role:</span> {offboarding.role}
                          </div>
                          <div>
                            <span className="text-slate-500">Department:</span> {offboarding.department}
                          </div>
                          <div>
                            <span className="text-slate-500">Last Day:</span>{' '}
                            {new Date(offboarding.last_working_day).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="text-slate-500">Tasks:</span> {completedTasks}/{totalTasks}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm" className="ml-4">
                        View Details →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No offboardings yet</h3>
              <p className="text-slate-500 mb-4">Start your first employee offboarding process</p>
              <Link href="/dashboard/offboardings/new">
                <Button>Create First Offboarding</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
