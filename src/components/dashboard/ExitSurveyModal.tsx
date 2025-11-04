'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Sparkles } from 'lucide-react'

interface ExitSurveyModalProps {
  offboardingId: string
  employeeName: string
  organizationId: string
  onComplete: () => void
}

export default function ExitSurveyModal({
  offboardingId,
  employeeName,
  organizationId,
  onComplete,
}: ExitSurveyModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    departure_reason: '',
    likelihood_to_recommend: 5,
    would_return: null as boolean | null,
    would_return_reason: '',
    suggestions_for_improvement: '',
  })

  const handleSubmit = async () => {
    if (!formData.departure_reason || formData.would_return === null) {
      toast({
        title: 'Missing Information',
        description: 'Please answer all required questions',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Save survey response
      const { error: surveyError } = await supabase
        .from('exit_surveys')
        .insert({
          offboarding_id: offboardingId,
          organization_id: organizationId,
          departure_reason: formData.departure_reason,
          likelihood_to_recommend: formData.likelihood_to_recommend,
          would_return: formData.would_return,
          would_return_reason: formData.would_return_reason || null,
          suggestions_for_improvement: formData.suggestions_for_improvement || null,
          submitted_by: user?.id,
        })

      if (surveyError) {
        throw surveyError
      }

      // Trigger AI analysis
      await fetch('/api/analyze-exits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
        }),
      })

      toast({
        title: '🎉 Survey Submitted!',
        description: 'AI is analyzing exit patterns now...',
      })

      onComplete()
    } catch (error: any) {
      console.error('Error submitting survey:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit survey',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Exit Survey for {employeeName}
          </DialogTitle>
          <DialogDescription>
            Help us improve! Your feedback takes 2 minutes and generates AI-powered insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question 1: Departure Reason */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              1. What's the primary reason for leaving? *
            </Label>
            <RadioGroup
              value={formData.departure_reason}
              onValueChange={(value) => setFormData({ ...formData, departure_reason: value })}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="better_opportunity" id="better_opportunity" />
                  <Label htmlFor="better_opportunity" className="font-normal cursor-pointer">
                    Better opportunity elsewhere
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compensation" id="compensation" />
                  <Label htmlFor="compensation" className="font-normal cursor-pointer">
                    Compensation/benefits
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="work_life_balance" id="work_life_balance" />
                  <Label htmlFor="work_life_balance" className="font-normal cursor-pointer">
                    Work-life balance
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="management" id="management" />
                  <Label htmlFor="management" className="font-normal cursor-pointer">
                    Management/leadership issues
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="career_growth" id="career_growth" />
                  <Label htmlFor="career_growth" className="font-normal cursor-pointer">
                    Limited career growth
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company_culture" id="company_culture" />
                  <Label htmlFor="company_culture" className="font-normal cursor-pointer">
                    Company culture
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal_reasons" id="personal_reasons" />
                  <Label htmlFor="personal_reasons" className="font-normal cursor-pointer">
                    Personal reasons
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal cursor-pointer">
                    Other
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Question 2: NPS */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              2. How likely would you recommend this company? (0-10) *
            </Label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={formData.likelihood_to_recommend === num ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, likelihood_to_recommend: num })}
                  className="w-10"
                >
                  {num}
                </Button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              0 = Not likely at all, 10 = Extremely likely
            </p>
          </div>

          {/* Question 3: Would Return */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              3. Would you consider returning in the future? *
            </Label>
            <RadioGroup
              value={formData.would_return === null ? '' : formData.would_return.toString()}
              onValueChange={(value) => setFormData({ ...formData, would_return: value === 'true' })}
            >
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="yes" />
                  <Label htmlFor="yes" className="font-normal cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="no" />
                  <Label htmlFor="no" className="font-normal cursor-pointer">
                    No
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {formData.would_return !== null && (
              <Textarea
                placeholder={formData.would_return ? 'What would make you want to return?' : 'Why not?'}
                value={formData.would_return_reason}
                onChange={(e) => setFormData({ ...formData, would_return_reason: e.target.value })}
                rows={2}
                className="mt-2"
              />
            )}
          </div>

          {/* Question 4: Suggestions */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              4. What could we improve? (Optional)
            </Label>
            <Textarea
              placeholder="Any suggestions for making this a better place to work?"
              value={formData.suggestions_for_improvement}
              onChange={(e) => setFormData({ ...formData, suggestions_for_improvement: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Submit & Generate Insights
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
                }
