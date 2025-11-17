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
  RefreshCw,
  Brain,
  Target,
  Lightbulb,
  FileText,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import FeatureGate from '@/components/FeatureGate'
import { trackAIInsightsViewed } from '@/lib/analytics'

// ❌ REMOVED WRONG HOOKS HERE

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
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  const [metrics, setMetrics] = useState<ExitMetrics | null>(null)
  const [organizationId, setOrganizationId] = useState<string>('')
  const [userPlan, setUserPlan] = useState<string>('starter')

  useEffect(() => {
    loadInsights()
    loadUserPlan()
  }, [])

  async function loadUserPlan() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('subscription_plan, subscription_status') // ← Add status
      .eq('id', user.id)
      .single()

    if (userData?.subscription_plan) {
      setUserPlan(userData.subscription_plan)
    }
    
    if (userData?.subscription_status) {
      setSubscriptionStatus(userData.subscription_status) // ← Add this
    }

    trackAIInsightsViewed()
  } catch (err) {
    console.error('Error loading user plan:', err)
  }
}
  async function loadInsights() {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const { organization } = await getCurrentOrganization()
      if (!organization) {
        setError('No organization found. Please create or join an organization.')
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
        throw insightsError
      }

      setInsights(insightsData || [])

      // Get exit survey metrics
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data: surveys, error: surveysError } = await supabase
        .from('exit_surveys')
        .select('*')
        .eq('organization_id', organization.id)
        .gte('submitted_at', ninetyDaysAgo.toISOString())

      if (!surveysError && surveys && surveys.length > 0) {
        const avgNps = surveys.reduce((sum, s) => sum + (s.likelihood_to_recommend || 0), 0) / surveys.length
        const boomerangCount = surveys.filter(s => s.would_return).length
        const boomerangPotential = (boomerangCount / surveys.length) * 100

        const reasonCounts: Record<string, number> = {}
        surveys.forEach(s => {
          const reason = s.departure_reason || 'unknown'
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
        })

        const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
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

    } catch (error: any) {
      console.error('Failed to load insights:', error)
      setError(error.message || 'Failed to load AI insights. Please try again.')
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

  // 🎨 Loading State with Skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-64 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-80 bg-slate-100 rounded mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded animate-pulse"></div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-10 w-20 bg-slate-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-5 w-48 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse"></div>
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
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              AI Exit Insights
            </h1>
            <p className="text-slate-600 mt-1">Predictive churn analysis powered by AI</p>
          </div>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Insights</h3>
            <p className="text-red-700 mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={loadInsights} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeInsights = insights.filter(i => !i.is_dismissed)
  const criticalInsights = activeInsights.filter(i => i.priority_level === 'critical' || i.priority_level === 'high')

  return (
  <FeatureGate feature="ai" userPlan={userPlan} subscriptionStatus={subscriptionStatus}>
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
        {metrics && metrics.total_exits >= 3 && (
          <Button 
            onClick={triggerAnalysis} 
            disabled={analyzing}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        )}
      </div>

      {/* Metrics Overview - Only show if surveys exist */}
      {metrics && metrics.total_exits > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">
                  Total Exits (90d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{metrics.total_exits}</div>
                <p className="text-xs text-blue-600 mt-1">Last 3 months</p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">
                  Average NPS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">
                  {metrics.avg_nps.toFixed(1)}
                  <span className="text-lg text-purple-600">/10</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    metrics.sentiment === 'positive' ? 'text-green-700 border-green-300 bg-green-50' :
                    metrics.sentiment === 'neutral' ? 'text-yellow-700 border-yellow-300 bg-yellow-50' :
                    'text-red-700 border-red-300 bg-red-50'
                  }
                >
                  {metrics.sentiment}
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-pink-900">
                  Boomerang Potential
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-900">
                  {metrics.boomerang_potential.toFixed(0)}%
                </div>
                <p className="text-xs text-pink-600 mt-1">Would return</p>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-indigo-900">
                  Top Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-indigo-900">
                  {formatDepartureReason(metrics.top_departure_reason)}
                </div>
                <p className="text-xs text-indigo-600 mt-1">Most common</p>
              </CardContent>
            </Card>
          </div>

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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900">
                All Insights ({activeInsights.length})
              </TabsTrigger>
              <TabsTrigger value="patterns" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900">
                Patterns
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-900">
                Recommendations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {activeInsights.length === 0 ? (
                <Card className="border-dashed border-2 border-purple-300 bg-purple-50">
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-purple-900 mb-2">
                      Ready to Generate Insights
                    </h3>
                    <p className="text-purple-700 mb-6 max-w-md mx-auto">
                      You have {metrics.total_exits} exit survey{metrics.total_exits !== 1 ? 's' : ''}. 
                      {metrics.total_exits >= 3 ? ' Run AI analysis to detect patterns and get actionable recommendations.' : ` Collect ${3 - metrics.total_exits} more to unlock AI insights.`}
                    </p>
                    {metrics.total_exits >= 3 ? (
                      <Button 
                        onClick={triggerAnalysis} 
                        disabled={analyzing}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {analyzing ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate AI Insights
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-xl mx-auto mt-6">
                        <h4 className="font-semibold text-blue-900 mb-2">How to Unlock AI Insights:</h4>
                        <ol className="text-left space-y-2 text-sm text-blue-800">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">1.</span>
                            <span>Complete offboardings and send exit surveys to departing employees</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">2.</span>
                            <span>Collect at least 3 exit survey responses</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">3.</span>
                            <span>Run AI analysis to detect churn patterns and get recommendations</span>
                          </li>
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                activeInsights.map((insight) => (
                  <Card key={insight.id} className="relative hover:shadow-lg transition-shadow">
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
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            Patterns Detected:
                          </h4>
                          <ul className="space-y-1">
                            {JSON.parse(insight.insight_summary).map((pattern: string, idx: number) => (
                              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-blue-600 mt-0.5">•</span>
                                <span>{pattern}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {insight.recommended_actions && insight.recommended_actions.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4 text-green-600" />
                              Recommended Actions:
                            </h4>
                            <div className="space-y-2">
                              {insight.recommended_actions.slice(0, 3).map((action: any, idx: number) => (
                                <div key={idx} className="bg-slate-50 p-3 rounded-lg border hover:border-slate-300 transition-colors">
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
                                            action.priority === 'high' ? 'border-red-300 text-red-700 bg-red-50' :
                                            action.priority === 'medium' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                                            'border-blue-300 text-blue-700 bg-blue-50'
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

                        {insight.affected_departments && insight.affected_departments.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4 text-purple-600" />
                              Affected Departments:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {insight.affected_departments.map((dept, idx) => (
                                <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-800">
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
              {activeInsights.length > 0 ? (
                activeInsights.map((insight) => (
                  <Card key={insight.id} className="hover:shadow-md transition-shadow">
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
                ))
              ) : (
                <Card className="border-dashed border-2 border-blue-300">
                  <CardContent className="text-center py-12">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-blue-300" />
                    <p className="text-slate-500">No patterns detected yet. Run AI analysis to see insights.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4 mt-6">
              {activeInsights.flatMap(insight => insight.recommended_actions || []).length > 0 ? (
                activeInsights.flatMap(insight => insight.recommended_actions || []).map((action: any, idx: number) => (
                  <Card key={idx} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{action.action}</h4>
                          <p className="text-sm text-slate-600 mb-2">{action.expected_impact}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="bg-slate-50">{action.department}</Badge>
                            <Badge 
                              variant="outline"
                              className={
                                action.priority === 'high' ? 'bg-red-50 text-red-700 border-red-300' :
                                action.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                                'bg-blue-50 text-blue-700 border-blue-300'
                              }
                            >
                              {action.priority} priority
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-dashed border-2 border-green-300">
                  <CardContent className="text-center py-12">
                    <Lightbulb className="w-16 h-16 mx-auto mb-4 text-green-300" />
                    <p className="text-slate-500">No recommendations yet. Run AI analysis to get actionable insights.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Departure Reasons Chart */}
          {Object.keys(metrics.departure_reasons).length > 0 && (
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
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
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
        </>
      ) : (
        // 🎨 Empty State - No Exit Surveys at All
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No Exit Survey Data Yet</h3>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto text-lg">
              Start collecting exit surveys to unlock powerful AI-driven insights about employee turnover, 
              churn patterns, and actionable retention strategies.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
              <Link href="/dashboard/offboardings">
                <Button variant="outline" size="lg">
                  <FileText className="w-5 h-5 mr-2" />
                  View Offboardings
                </Button>
              </Link>
              <Link href="/dashboard/offboardings/new">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" size="lg">
                  Create Offboarding
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Feature Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">AI Pattern Detection</h4>
                <p className="text-sm text-slate-600">
                  Automatically identify trends in employee departures across departments, roles, and reasons
                </p>
              </div>

              <div className="bg-pink-50 p-6 rounded-lg border border-pink-200">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-pink-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Churn Predictions</h4>
                <p className="text-sm text-slate-600">
                  Get early warnings about departments at risk and proactive recommendations
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Lightbulb className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Actionable Insights</h4>
                <p className="text-sm text-slate-600">
                  Receive specific, prioritized actions to improve retention and workplace culture
                </p>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-8 max-w-3xl mx-auto mt-10">
              <h4 className="font-bold text-purple-900 mb-6 text-xl flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6" />
                How AI Insights Work
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    1
                  </div>
                  <h5 className="font-semibold text-slate-900 mb-2">Collect Surveys</h5>
                  <p className="text-sm text-slate-600">
                    Send exit surveys to departing employees. Need at least 3 responses.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    2
                  </div>
                  <h5 className="font-semibold text-slate-900 mb-2">AI Analysis</h5>
                  <p className="text-sm text-slate-600">
                    Our AI analyzes responses to detect patterns and predict churn risks.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-3">
                    3
                  </div>
                  <h5 className="font-semibold text-slate-900 mb-2">Take Action</h5>
                  <p className="text-sm text-slate-600">
                    Get prioritized recommendations to improve retention and culture.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto mt-8 text-left">
              <h4 className="font-semibold text-blue-900 mb-4 text-center">What You'll Learn:</h4>
              <ul className="space-y-3 text-sm text-blue-800">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Departure Trends:</strong> Identify why employees are leaving (compensation, culture, growth, etc.)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Department Risks:</strong> See which teams have higher turnover rates</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>NPS Scores:</strong> Measure employee satisfaction and likelihood to recommend</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Boomerang Potential:</strong> Track how many ex-employees would consider returning</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Priority Actions:</strong> Get specific, ranked recommendations to improve retention</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </FeatureGate>
  )
}
