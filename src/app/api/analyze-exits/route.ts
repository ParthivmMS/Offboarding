import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeExitData, generateChurnAlert } from '@/lib/groq'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user belongs to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get exit surveys from last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: exitSurveys, error: surveysError } = await supabase
      .from('exit_surveys')
      .select(`
        *,
        offboardings (
          employee_name,
          department,
          role
        )
      `)
      .eq('organization_id', organizationId)
      .gte('submitted_at', ninetyDaysAgo.toISOString())
      .order('submitted_at', { ascending: false })

    if (surveysError) {
      console.error('Error fetching surveys:', surveysError)
      throw new Error('Failed to fetch exit surveys')
    }

    // Need at least 3 surveys for meaningful analysis
    if (!exitSurveys || exitSurveys.length < 3) {
      return NextResponse.json({
        success: true,
        message: 'Not enough data yet. Need at least 3 exit surveys for AI analysis.',
        dataCount: exitSurveys?.length || 0,
      })
    }

    console.log(`Analyzing ${exitSurveys.length} exit surveys for org: ${organizationId}`)

    // Analyze with Groq AI
    const analysis = await analyzeExitData(exitSurveys)

    if (!analysis) {
      throw new Error('AI analysis failed')
    }

    console.log('AI Analysis completed:', analysis)

    // Determine priority based on analysis
    const getPriority = (analysis: any): string => {
      const { key_metrics } = analysis
      
      // Critical: Low NPS (<6) or negative sentiment
      if (key_metrics.avg_nps < 6 || key_metrics.sentiment === 'negative') {
        return 'critical'
      }
      
      // High: Multiple churn risks
      if (analysis.churn_risks.length >= 3) {
        return 'high'
      }
      
      // Medium: Some concerns
      if (analysis.churn_risks.length >= 1) {
        return 'medium'
      }
      
      return 'low'
    }

    const priority = getPriority(analysis)

    // Save insights to database
    const { data: insight, error: insertError } = await supabase
      .from('ai_insights')
      .insert({
        organization_id: organizationId,
        analysis_type: 'exit_pattern',
        insight_summary: JSON.stringify(analysis.patterns),
        priority_level: priority,
        recommended_actions: analysis.recommendations,
        affected_departments: extractDepartments(exitSurveys),
        confidence_score: calculateConfidence(exitSurveys.length),
        sample_size: exitSurveys.length,
        time_period_days: 90,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving insight:', insertError)
      throw new Error('Failed to save insights')
    }

    // Generate churn alert if priority is high/critical
    if (priority === 'high' || priority === 'critical') {
      const alertMessage = await generateChurnAlert(analysis)
      
      // Send email notification to admins/HR
      try {
        const { data: admins } = await supabase
          .from('organization_members')
          .select('users!inner(email, name)')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .in('role', ['admin', 'hr_manager'])

        if (admins && admins.length > 0) {
          const recipients = admins.map((a: any) => a.users.email)
          
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'churn_alert',
              to: recipients,
              alertMessage,
              insightId: insight.id,
              priority,
              patterns: analysis.patterns,
              recommendations: analysis.recommendations,
            }),
          })
        }
      } catch (emailError) {
        console.error('Failed to send churn alert email:', emailError)
        // Don't fail the analysis if email fails
      }
    }

    return NextResponse.json({
      success: true,
      insight: {
        id: insight.id,
        priority,
        patterns: analysis.patterns,
        churn_risks: analysis.churn_risks,
        recommendations: analysis.recommendations,
        key_metrics: analysis.key_metrics,
      },
    })

  } catch (error: any) {
    console.error('Error analyzing exits:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze exit data' },
      { status: 500 }
    )
  }
}

// Helper function to extract unique departments
function extractDepartments(surveys: any[]): string[] {
  const departments = surveys
    .map(s => s.offboardings?.department)
    .filter(Boolean)
  return [...new Set(departments)]
}

// Helper function to calculate confidence score
function calculateConfidence(sampleSize: number): number {
  // More samples = higher confidence
  // 3 surveys = 0.50, 10 surveys = 0.80, 20+ surveys = 0.95
  if (sampleSize >= 20) return 0.95
  if (sampleSize >= 10) return 0.80
  if (sampleSize >= 5) return 0.65
  return 0.50
}
