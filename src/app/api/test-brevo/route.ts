import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing Brevo API key...')
    
    // Check if API key exists
    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({
        error: 'BREVO_API_KEY not found in environment variables',
      }, { status: 500 })
    }

    console.log('API key exists:', process.env.BREVO_API_KEY.substring(0, 20) + '...')

    // Test 1: Check account
    const accountResponse = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
    })

    const accountData = await accountResponse.json()
    console.log('Account response:', accountData)

    if (!accountResponse.ok) {
      return NextResponse.json({
        error: 'Brevo API key is invalid',
        details: accountData,
        status: accountResponse.status,
      }, { status: 400 })
    }

    // Test 2: Send test email
    const testEmailData = {
      sender: {
        name: 'OffboardPro Test',
        email: 'parthivmssince2005@gmail.com', // Your Brevo account email
      },
      to: [
        { email: 'parthivmssince2005@gmail.com' }
      ],
      subject: 'Test Email from OffboardPro',
      htmlContent: '<h1>Test Email</h1><p>If you receive this, Brevo is working!</p>',
    }

    console.log('Sending test email...')

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(testEmailData),
    })

    const emailResult = await emailResponse.json()
    console.log('Email response:', emailResult)

    if (!emailResponse.ok) {
      return NextResponse.json({
        error: 'Failed to send test email',
        details: emailResult,
        status: emailResponse.status,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: '✅ Brevo is working! Check your inbox.',
      account: {
        email: accountData.email,
        firstName: accountData.firstName,
        lastName: accountData.lastName,
      },
      emailSent: {
        messageId: emailResult.messageId,
      },
    })
  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Exception occurred',
      message: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
