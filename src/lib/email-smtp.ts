import nodemailer from 'nodemailer'

interface SendEmailParams {
  to: string[]
  subject: string
  htmlContent: string
  textContent?: string
}

export async function sendSMTPEmail({
  to,
  subject,
  htmlContent,
  textContent,
}: SendEmailParams) {
  try {
    console.log('📧 Sending email via SMTP to:', to)
    
    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: '9a30b6001@smtp-brevo.com', // Your SMTP login
        pass: process.env.BREVO_SMTP_KEY, // Your SMTP key (not API key!)
      },
    })

    // Send email
    const info = await transporter.sendMail({
      from: '"OffboardPro" <parthivmssince2005@gmail.com>',
      to: to.join(', '),
      subject: subject,
      text: textContent || 'Please view this email in an HTML-capable email client.',
      html: htmlContent,
    })

    console.log('✅ Email sent! Message ID:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('❌ SMTP error:', error)
    return { success: false, error: error.message }
  }
}
