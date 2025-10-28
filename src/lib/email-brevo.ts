import * as brevo from '@getbrevo/brevo'

const apiInstance = new brevo.TransactionalEmailsApi()
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || ''
)

interface SendEmailParams {
  to: string[]
  subject: string
  htmlContent: string
  senderName?: string
  senderEmail?: string
}

export async function sendEmail({
  to,
  subject,
  htmlContent,
  senderName = 'OffboardPro',
  senderEmail = 'no-reply@offboardpro.com',
}: SendEmailParams) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail()
    
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = htmlContent
    sendSmtpEmail.sender = { name: senderName, email: senderEmail }
    sendSmtpEmail.to = to.map(email => ({ email }))
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail)
    
    console.log('Email sent successfully:', result)
    return { success: true, data: result }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}
