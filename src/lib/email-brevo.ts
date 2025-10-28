const SibApiV3Sdk = require('sib-api-v3-sdk')

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

    // Initialize API client
    const defaultClient = SibApiV3Sdk.ApiClient.instance
    const apiKey = defaultClient.authentications['api-key']
    apiKey.apiKey = process.env.BREVO_API_KEY

    // Create API instance
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()

    // Prepare email data
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = htmlContent
    sendSmtpEmail.sender = { name: senderName, email: senderEmail }
    sendSmtpEmail.to = to.map(email => ({ email }))

    // Send email
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail)
    
    console.log('✅ Brevo email sent successfully:', result.messageId)
    return { success: true, data: result }
  } catch (error: any) {
    console.error('❌ Error sending Brevo email:', error)
    return { success: false, error }
  }
}
