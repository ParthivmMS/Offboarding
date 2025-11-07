'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'

export default function ExitSurveyPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [validToken, setValidToken] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [tokenData, setTokenData] = useState<any>(null)

  const [formData, setFormData] = useState({
    departure_reason: '',
    likelihood_to_recommend: 5,
    would_return: null as boolean | null,
    would_return_reason: '',
    suggestions_for_improvement: '',
  })

  useEffect(() => {
    validateToken()
  }, [token])

  async function validateToken() {
    try {
      const response = await fetch('/api/exit-survey/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (data.valid) {
        setValidToken(true)
        setTokenData(data.surveyToken)
      } else {
        setError(data.error || 'Invalid or expired survey link')
      }
    } catch (err: any) {
      console.error('Token validation error:', err)
      setError('Failed to validate survey link')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.departure_reason || formData.would_return === null) {
      setError('Please answer all required questions')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/exit-survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
      } else {
        setError(data.error || 'Failed to submit survey')
      }
    } catch (err: any) {
      console.error('Survey submission error:', err)
      setError('Failed to submit survey. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Validating survey link...</p>
        </div>
      </div>
    )
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Survey Link</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <p className="text-sm text-slate-500">
            This link may have expired or already been used.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h1>
          <p className="text-slate-600 mb-6">
            Your feedback has been submitted successfully.
          </p>
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-900">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Your responses will be analyzed by AI to generate insights.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-8 h-8" />
              Exit Survey
            </h1>
            <p className="text-purple-100">
              Hi {tokenData?.employeeName}, help us improve
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  1. What's the primary reason for leaving? *
                </Label>
                <RadioGroup
                  value={formData.departure_reason}
                  onValueChange={(value) => setFormData({ ...formData, departure_reason: value })}
                >
                  <div className="space-y-3">
                    {[
                      { value: 'better_opportunity', label: 'Better opportunity elsewhere' },
                      { value: 'compensation', label: 'Compensation/benefits' },
                      { value: 'work_life_balance', label: 'Work-life balance' },
                      { value: 'management', label: 'Management/leadership issues' },
                      { value: 'career_growth', label: 'Limited career growth' },
                      { value: 'company_culture', label: 'Company culture' },
                      { value: 'personal_reasons', label: 'Personal reasons' },
                      { value: 'other', label: 'Other' },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value} className="cursor-pointer flex-1">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  2. How likely would you recommend this company? (0-10) *
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant={formData.likelihood_to_recommend === num ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, likelihood_to_recommend: num })}
                      className="w-12 h-12"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  3. Would you consider returning in the future? *
                </Label>
                <RadioGroup
                  value={formData.would_return === null ? '' : formData.would_return.toString()}
                  onValueChange={(value) => setFormData({ ...formData, would_return: value === 'true' })}
                >
                  <div className="flex gap-6">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="true" id="yes" />
                      <Label htmlFor="yes" className="cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="false" id="no" />
                      <Label htmlFor="no" className="cursor-pointer">No</Label>
                    </div>
                  </div>
                </RadioGroup>

                {formData.would_return !== null && (
                  <Textarea
                    placeholder={formData.would_return ? 'Why would you return?' : 'Why not?'}
                    value={formData.would_return_reason}
                    onChange={(e) => setFormData({ ...formData, would_return_reason: e.target.value })}
                    rows={3}
                  />
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  4. What could we improve? (Optional)
                </Label>
                <Textarea
                  placeholder="Any suggestions?"
                  value={formData.suggestions_for_improvement}
                  onChange={(e) => setFormData({ ...formData, suggestions_for_improvement: e.target.value })}
                  rows={4}
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <Button
                type="submit"
                disabled={submitting || !formData.departure_reason || formData.would_return === null}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-lg py-6"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
