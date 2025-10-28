interface SendEmailParams {
  to: string[]
  subject: string
  htmlContent: string
  senderName?: string
  senderEmail?: string
}

export async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
  senderName = 'OffboardPro',
  senderEmail = 'notifications@offboardpro.com',
}: SendEmailParams) {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured')
    }

    // Prepare email data for Brevo API
    const emailData = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: to.map(email => ({ email })),
      subject: subject,
      htmlContent: htmlContent,
    }

    // Send via Brevo REST API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(emailData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Brevo API error: ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    
    console.log('✅ Brevo email sent successfully:', result.messageId)
    return { success: true, data: result }
  } catch (error: any) {
    console.error('❌ Error sending Brevo email:', error)
    return { success: false, error: error.message }
  }
}
