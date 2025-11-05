'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentOrganization } from '@/lib/workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  BarChart3, 
  Sparkles,
  X,
  RefreshCw
} from 'lucide-react'

interface Insight {
  id: string
  analysis_type: string
  insight_summary: string
  priority_level: string
  recommended_actions: any[]
  affected_departments: string[]
  confidence_score: number
  sample_size: number
  time_period_days: number
  generated_at: string
  is_dismissed: boolean
}

interface ExitMetrics {
  total_exits: number
  avg_nps: number
  boomerang_potential: number
  top_departure_reason: string
  sentiment: string
  departure_reasons: Record<string, number>
}

export default function InsightsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  const [metrics, setMetrics] = useState<ExitMetrics | null>(null)
  const [organizationId, setOrganizationId] = useState<string>('')

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { organization } = await getCurrentOrganization()
      if (!organization) {
        console.error('No organization')
        setLoading(false)
        return
      }

      setOrganizationId(organization.id)

      // Get AI insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('organization_id', organization.id)
        .order('generated_at', { ascending: false })
        .limit(10)

      if (insightsError) {
        console.error('Error fetching insights:', insightsError)
      } else {
        setInsights(insightsData || [])
      }

      // Get exit survey metrics
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data: surveys, error: surveysError } = await supabase
        .from('exit_surveys')
        .select('*')
        .eq('organization_id', organization.id)
        .gte('submitted_at', ninetyDaysAgo.toISOString())

      if (!surveysError && surveys && surveys.length > 0) {
        // Calculate metrics
        const avgNps = surveys.reduce((sum, s) => sum + (s.likelihood_to_recommend || 0), 0) / surveys.length
        const boomerangCount = surveys.filter(s => s.would_return).length
        const boomerangPotential = (boomerangCount / surveys.length) * 100

        // Count departure reasons
        const reasonCounts: Record<string, number> = {}
        surveys.forEach(s => {
          const reason = s.departure_reason || 'unknown'
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
        })

        const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'

        // Determine sentiment
        const sentiment = avgNps >= 7 ? 'positive' : avgNps >= 5 ? 'neutral' : 'negative'

        setMetrics({
          total_exits: surveys.length,
          avg_nps: avgNps,
          boomerang_potential: boomerangPotential,
          top_departure_reason: topReason,
          sentiment,
          departure_reasons: reasonCounts,
        })
      }

    } catch (error) {
      console.error('Failed to load insights:', error)
    } finally {
      setLoading(false)
    }
  }

  async function triggerAnalysis() {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/analyze-exits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })

      const result = await response.json()

      if (result.success) {
        alert('✨ AI analysis complete! Check your insights below.')
        loadInsights()
      } else {
        alert(result.message || 'Analysis failed')
      }
    } catch (error) {
      console.error('Analysis error:', error)
      alert('Failed to trigger analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  async function dismissInsight(insightId: string) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase
        .from('ai_insights')
        .update({ 
          is_dismissed: true,
          dismissed_by: user?.id,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', insightId)

      setInsights(insights.filter(i => i.id !== insightId))
    } catch (error) {
      console.error('Error dismissing insight:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />
      case 'medium':
        return <TrendingDown className="w-5 h-5" />
      default:
        return <TrendingUp className="w-5 h-5" />
    }
  }

  const formatDepartureReason = (reason: string) => {
    return reason
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const activeInsights = insights.filter(i => !i.is_dismissed)
  const criticalInsights = activeInsights.filter(i => i.priority_level === 'critical' || i.priority_level === 'high')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            AI Exit Insights
          </h1>
          <p className="text-slate-600 mt-1">
            Predictive churn analysis powered by AI
          </p>
        </div>
        <Button 
          onClick={triggerAnalysis} 
          disabled={analyzing}
          className="gap-2"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run Analysis
            </>
          )}
        </Button>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Exits (90d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.total_exits}</div>
              <p className="text-xs text-slate-500 mt-1">Last 3 months</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Average NPS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.avg_nps.toFixed(1)}
                <span className="text-lg text-slate-500">/10</span>
              </div>
              <Badge 
                variant="outline" 
                className={
                  metrics.sentiment === 'positive' ? 'text-green-700 border-green-300' :
                  metrics.sentiment === 'neutral' ? 'text-yellow-700 border-yellow-300' :
                  'text-red-700 border-red-300'
                }
              >
                {metrics.sentiment}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Boomerang Potential
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {metrics.boomerang_potential.toFixed(0)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">Would return</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Top Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-slate-900">
                {formatDepartureReason(metrics.top_departure_reason)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Most common</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Alerts */}
      {criticalInsights.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              🚨 {criticalInsights.length} High Priority Alert{criticalInsights.length > 1 ? 's' : ''}
            </CardTitle>
            <CardDescription className="text-red-700">
              Immediate action required to prevent further turnover
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalInsights.slice(0, 2).map(insight => (
                <div key={insight.id} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge className={getPriorityColor(insight.priority_level)}>
                        {insight.priority_level.toUpperCase()}
                      </Badge>
                      <div className="mt-2 text-sm text-slate-700">
                        {JSON.parse(insight.insight_summary)[0]}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Insights ({activeInsights.length})
          </TabsTrigger>
          <TabsTrigger value="patterns">
            Patterns
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {activeInsights.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold mb-2">No Insights Yet</h3>
                <p className="text-slate-500 mb-4">
                  Complete at least 3 exit surveys to generate AI insights
                </p>
                <Button onClick={triggerAnalysis} disabled={analyzing}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeInsights.map((insight) => (
              <Card key={insight.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getPriorityIcon(insight.priority_level)}
                      <div>
                        <Badge className={getPriorityColor(insight.priority_level)}>
                          {insight.priority_level.toUpperCase()}
                        </Badge>
                        <p className="text-sm text-slate-500 mt-1">
                          Based on {insight.sample_size} exits | {(insight.confidence_score * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissInsight(insight.id)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Patterns */}
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">📊 Patterns Detected:</h4>
                      <ul className="space-y-1">
                        {JSON.parse(insight.insight_summary).map((pattern: string, idx: number) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{pattern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    {insight.recommended_actions && insight.recommended_actions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">💡 Recommended Actions:</h4>
                        <div className="space-y-2">
                          {insight.recommended_actions.slice(0, 3).map((action: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-lg border">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900">{action.action}</p>
                                  <p className="text-sm text-slate-600 mt-1">{action.expected_impact}</p>
                                  <div className="flex gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {action.department}
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        action.priority === 'high' ? 'border-red-300 text-red-700' :
                                        action.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                        'border-blue-300 text-blue-700'
                                      }`}
                                    >
                                      {action.priority} priority
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Affected Departments */}
                    {insight.affected_departments && insight.affected_departments.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">🏢 Affected Departments:</h4>
                        <div className="flex flex-wrap gap-2">
                          {insight.affected_departments.map((dept, idx) => (
                            <Badge key={idx} variant="secondary">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4 mt-6">
          {activeInsights.map((insight) => (
            <Card key={insight.id}>
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {JSON.parse(insight.insight_summary).map((pattern: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{pattern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 mt-6">
          {activeInsights.flatMap(insight => insight.recommended_actions || []).map((action: any, idx: number) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">{action.action}</h4>
                    <p className="text-sm text-slate-600 mb-2">{action.expected_impact}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{action.department}</Badge>
                      <Badge variant="outline">{action.priority} priority</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Departure Reasons Chart */}
      {metrics && Object.keys(metrics.departure_reasons).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Departure Reasons Breakdown</CardTitle>
            <CardDescription>Last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.departure_reasons)
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => {
                  const percentage = (count / metrics.total_exits) * 100
                  return (
                    <div key={reason}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {formatDepartureReason(reason)}
                        </span>
                        <span className="text-sm text-slate-500">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
