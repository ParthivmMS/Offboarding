// src/lib/email-brevo.ts

interface SendEmailParams {
  to: string[]
  subject: string
  htmlContent: string
  senderName?: string
  senderEmail?: string
  textContent?: string
}

export async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
  textContent,
  senderName = 'OffboardPro',
  senderEmail = 'parthivmssince2005@gmail.com', // ✅ FIX: Use verified Gmail address
}: SendEmailParams) {
  try {
    console.log('📧 Starting Brevo email send to:', to)
    console.log('📧 Subject:', subject)
    console.log('📧 Sender:', senderEmail) // ✅ Added logging
    
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY is not configured')
      throw new Error('BREVO_API_KEY is not configured')
    }

    console.log('🔑 Brevo API key found (length):', process.env.BREVO_API_KEY.length)

    // Prepare email data for Brevo API
    const emailData = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: to.map(email => ({ email })),
      subject: subject,
      htmlContent: htmlContent,
      ...(textContent && { textContent })
    }

    console.log('📤 Sending to Brevo API with sender:', emailData.sender)

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

    const responseText = await response.text()
    console.log('📬 Brevo response status:', response.status)
    console.log('📬 Brevo response:', responseText)

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { message: responseText }
      }
      
      // ✅ Better error logging
      console.error('❌ Brevo API Error Details:', {
        status: response.status,
        error: errorData,
        sender: emailData.sender,
        recipients: to
      })
      
      throw new Error(`Brevo API error (${response.status}): ${JSON.stringify(errorData)}`)
    }

    const result = JSON.parse(responseText)
    
    console.log('✅ Brevo email sent successfully! Message ID:', result.messageId)
    return { success: true, data: result }
  } catch (error: any) {
    console.error('❌ Error sending Brevo email:', error)
    return { success: false, error: error.message }
  }
}
