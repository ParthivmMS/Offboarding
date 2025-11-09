'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentOrganization } from '@/lib/workspace'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Search, FileX, AlertCircle, RefreshCw, Users, Calendar, CheckCircle2, Clock } from 'lucide-react'

export default function OffboardingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offboardings, setOffboardings] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadOffboardings()
  }, [])

  async function loadOffboardings() {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push('/login')
        return
      }

      const { organization } = await getCurrentOrganization()

      if (!organization) {
        setError('No organization found. Please create or join an organization.')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('offboardings')
        .select(`
          *,
          tasks (
            id,
            completed
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setOffboardings(data || [])
    } catch (error: any) {
      console.error('Failed to load offboardings:', error)
      setError(error.message || 'Failed to load offboardings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return 0
    const completed = tasks.filter(t => t.completed).length
    return Math.round((completed / tasks.length) * 100)
  }

  const filteredOffboardings = offboardings.filter(offboarding =>
    offboarding.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 🎨 Loading State with Skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-48 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-slate-100 rounded mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 w-40 bg-slate-200 rounded animate-pulse"></div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="h-10 bg-slate-100 rounded animate-pulse"></div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-6 w-48 bg-slate-200 rounded animate-pulse"></div>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-slate-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ❌ Error State
  if (error) {
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

        <Card className="border-red-200 bg-red-50">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Offboardings</h3>
            <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={loadOffboardings} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Offboardings</h1>
          <p className="text-slate-600 mt-1">Manage employee exit processes</p>
        </div>
        <Link href="/dashboard/offboardings/new">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            New Offboarding
          </Button>
        </Link>
      </div>

      {/* Search Bar - Only show if offboardings exist */}
      {offboardings.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by employee name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offboardings List */}
      <div className="space-y-4">
        {filteredOffboardings.length > 0 ? (
          <>
            {/* Stats Summary - Show when offboardings exist */}
            {!searchTerm && offboardings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Total</p>
                        <p className="text-2xl font-bold text-slate-900">{offboardings.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">In Progress</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {offboardings.filter(o => o.status === 'in_progress').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Completed</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {offboardings.filter(o => o.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">This Month</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {offboardings.filter(o => {
                            const created = new Date(o.created_at)
                            const now = new Date()
                            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                          }).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Offboarding Cards */}
            {filteredOffboardings.map((offboarding) => {
              const progress = calculateProgress(offboarding.tasks)
              const completedTasks = offboarding.tasks.filter((t: any) => t.completed).length
              const totalTasks = offboarding.tasks.length

              return (
                <Link key={offboarding.id} href={`/dashboard/offboardings/${offboarding.id}`}>
                  <Card className="hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer border-slate-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">{offboarding.employee_name}</h3>
                            <Badge
                              className={
                                offboarding.status === 'completed'
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : offboarding.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }
                            >
                              {offboarding.status === 'in_progress' ? 'In Progress' : 
                               offboarding.status === 'completed' ? 'Completed' : 
                               offboarding.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 mb-4">
                            <div>
                              <span className="text-slate-500 font-medium">Role:</span> 
                              <span className="ml-1 text-slate-900">{offboarding.role}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium">Department:</span> 
                              <span className="ml-1 text-slate-900">{offboarding.department}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium">Last Day:</span>{' '}
                              <span className="ml-1 text-slate-900">
                                {new Date(offboarding.last_working_day).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-medium">Tasks:</span> 
                              <span className="ml-1 text-slate-900 font-semibold">{completedTasks}/{totalTasks}</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 font-medium">Progress</span>
                              <span className="font-semibold text-slate-900">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-2.5 rounded-full transition-all duration-500 ${
                                  progress === 100 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                    : 'bg-gradient-to-r from-blue-500 to-purple-600'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          View Details →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </>
        ) : (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="text-center py-16">
              {searchTerm ? (
                // Search No Results State
                <>
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No Results Found</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    No offboardings match <strong>"{searchTerm}"</strong>. Try a different search term.
                  </p>
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                </>
              ) : (
                // Empty State - No Offboardings
                <>
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileX className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">No Offboardings Yet</h3>
                  <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">
                    Start managing employee exits efficiently. Create your first offboarding to track tasks, ensure security, and maintain compliance.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
                    <Link href="/dashboard/offboardings/new">
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" size="lg">
                        <Plus className="w-5 h-5 mr-2" />
                        Create First Offboarding
                      </Button>
                    </Link>
                  </div>

                  {/* Feature Highlights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto text-left">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">Task Management</h4>
                      <p className="text-sm text-slate-600">Track completion across IT, HR, and other departments</p>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                        <AlertCircle className="w-5 h-5 text-purple-600" />
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">Security Scanner</h4>
                      <p className="text-sm text-slate-600">Revoke access to company apps and data</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">Exit Surveys</h4>
                      <p className="text-sm text-slate-600">Gather feedback and AI-powered insights</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
                        }
