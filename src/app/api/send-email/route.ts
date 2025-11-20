// In send-email/route.ts
// Replace the email_verification case with this SIMPLE version

case 'email_verification':
  // ✅ SIMPLE VERSION - Just like the test email
  const htmlContent = `
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h1>Verify Your Email</h1>
      <p>Hi ${data.name}!</p>
      <p>Thanks for signing up for ${data.organizationName} on OffboardPro.</p>
      <p>Click the link below to verify your email:</p>
      <p><a href="${data.verificationLink}" style="color: #2563eb;">Verify Email Address</a></p>
      <p>Or copy this link: ${data.verificationLink}</p>
      <p>Thanks,<br>OffboardPro Team</p>
    </body>
    </html>
  `
  
  // ✅ Use the SAME sender as test email
  result = await sendBrevoEmail({
    to: [to],
    subject: 'Verify Your Email - OffboardPro',
    htmlContent,
    senderName: 'OffboardPro',
    senderEmail: 'parthivmssince2005@gmail.com', // ✅ Same as test email!
  })
  break
