import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function analyzeExitData(exitSurveys: any[]) {
  if (exitSurveys.length === 0) {
    return null
  }

  const prompt = `You are an HR analytics expert. Analyze these exit survey responses and provide actionable insights.

Exit Survey Data (${exitSurveys.length} responses):
${JSON.stringify(exitSurveys, null, 2)}

Provide analysis in this JSON format:
{
  "patterns": ["pattern 1", "pattern 2", ...],
  "churn_risks": ["risk 1", "risk 2", ...],
  "recommendations": [
    {
      "action": "specific action to take",
      "department": "affected department",
      "priority": "high|medium|low",
      "expected_impact": "what this will achieve"
    }
  ],
  "key_metrics": {
    "avg_nps": number,
    "boomerang_potential": number (0-100%),
    "top_departure_reason": "reason",
    "sentiment": "positive|neutral|negative"
  }
}

Be specific, actionable, and data-driven.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR analytics assistant. Provide concise, actionable insights from exit survey data.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from Groq')
    }

    return JSON.parse(response)
  } catch (error) {
    console.error('Groq API error:', error)
    throw error
  }
}

export async function generateChurnAlert(insight: any) {
  const prompt = `Based on this exit pattern analysis, generate a short, urgent alert message for HR:

${JSON.stringify(insight, null, 2)}

Format: Single paragraph, 2-3 sentences, emphasize urgency and specific action needed.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an alert system. Generate concise, urgent notifications.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    })

    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Groq API error:', error)
    throw error
  }
}
