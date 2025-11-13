import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="font-bold text-xl">OffboardPro</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: November 13, 2025</p>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              At OffboardPro, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">1.1 Information You Provide</h3>
              <p className="text-gray-700 mb-4">
                We collect information you directly provide to us:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Account Information:</strong> Name, email address, password, organization name</li>
                <li><strong>Profile Information:</strong> Role, department, contact details</li>
                <li><strong>Employee Data:</strong> Names, emails, departments, last working dates of employees being offboarded</li>
                <li><strong>Task Data:</strong> Offboarding tasks, notes, attachments, completion status</li>
                <li><strong>Survey Responses:</strong> Exit survey answers and feedback</li>
                <li><strong>Payment Information:</strong> Billing details (processed securely by Stripe)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">1.2 Information Collected Automatically</h3>
              <p className="text-gray-700 mb-4">
                When you use our Service, we automatically collect:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Log Data:</strong> IP address, browser type, device information, operating system</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on pages</li>
                <li><strong>Cookies:</strong> See our <Link href="/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link> for details</li>
                <li><strong>Performance Data:</strong> Error logs, crash reports, API response times</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">1.3 Information from Third Parties</h3>
              <p className="text-gray-700 mb-4">
                We may receive information from:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Authentication Providers:</strong> If you sign up via OAuth (Google, Microsoft, etc.)</li>
                <li><strong>Payment Processors:</strong> Stripe for payment processing</li>
                <li><strong>Analytics Services:</strong> Google Analytics for usage insights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Provide the Service:</strong> Create accounts, manage offboardings, send notifications</li>
                <li><strong>Process Payments:</strong> Bill subscriptions, process refunds</li>
                <li><strong>Communicate:</strong> Send emails about your account, product updates, security alerts</li>
                <li><strong>Improve the Service:</strong> Analyze usage, fix bugs, develop new features</li>
                <li><strong>Ensure Security:</strong> Detect fraud, prevent abuse, maintain platform security</li>
                <li><strong>Comply with Laws:</strong> Meet legal obligations, respond to lawful requests</li>
                <li><strong>AI Features:</strong> Generate insights from exit survey data (anonymized)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Share Your Information</h2>
              <p className="text-gray-700 mb-4">
                We do NOT sell your personal information. We may share your information with:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">3.1 Service Providers</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Supabase:</strong> Database and authentication</li>
                <li><strong>Vercel:</strong> Hosting and deployment</li>
                <li><strong>Stripe:</strong> Payment processing</li>
                <li><strong>Brevo:</strong> Email delivery</li>
                <li><strong>Groq:</strong> AI analysis (anonymized data only)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">3.2 Within Your Organization</h3>
              <p className="text-gray-700 mb-4">
                Data is shared with team members in your organization based on their role and permissions.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">3.3 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose information if required by law, court order, or government request.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">3.4 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                If OffboardPro is acquired or merged, your information may be transferred to the new owner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Encryption:</strong> All data in transit uses TLS/SSL encryption</li>
                <li><strong>Access Controls:</strong> Role-based permissions, Row-Level Security (RLS)</li>
                <li><strong>Authentication:</strong> Secure password hashing, session management</li>
                <li><strong>Infrastructure:</strong> Secure cloud hosting with automatic backups</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring and alerts</li>
              </ul>
              <p className="text-gray-700 mt-4">
                However, no system is 100% secure. You are responsible for maintaining the confidentiality of your account credentials.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your information for as long as:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Your account is active</li>
                <li>Needed to provide the Service</li>
                <li>Required by law (e.g., tax records, audit logs)</li>
              </ul>
              <p className="text-gray-700 mt-4">
                After account deletion, we retain certain data for 30 days to allow recovery, then permanently delete it. Some data may be retained in anonymized form for analytics.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
              <p className="text-gray-700 mb-4">
                Depending on your location, you may have these rights:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Objection:</strong> Object to certain data processing activities</li>
                <li><strong>Restriction:</strong> Limit how we use your data</li>
                <li><strong>Withdrawal:</strong> Withdraw consent for data processing</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, contact us at <a href="mailto:privacy@offboardpro.com" className="text-blue-600 hover:underline">privacy@offboardpro.com</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure adequate protection through:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>Privacy Shield frameworks (where applicable)</li>
                <li>Data processing agreements with service providers</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700">
                OffboardPro is not intended for children under 18. We do not knowingly collect data from children. If you believe a child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Authentication and session management</li>
                <li>Remembering your preferences</li>
                <li>Analytics and performance monitoring</li>
              </ul>
              <p className="text-gray-700">
                For detailed information, see our <Link href="/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Third-Party Links</h2>
              <p className="text-gray-700">
                Our Service may contain links to third-party websites. We are not responsible for their privacy practices. Please review their privacy policies before providing any information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the Service. The "Last updated" date will reflect the most recent changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. GDPR Compliance (EU Users)</h2>
              <p className="text-gray-700 mb-4">
                If you are in the European Union, we comply with GDPR requirements:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Legal Basis:</strong> We process your data based on consent, contract performance, or legitimate interests</li>
                <li><strong>Data Protection Officer:</strong> Contact dpo@offboardpro.com for GDPR inquiries</li>
                <li><strong>Right to Complain:</strong> You can file a complaint with your local data protection authority</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. CCPA Compliance (California Users)</h2>
              <p className="text-gray-700 mb-4">
                If you are a California resident, you have additional rights under CCPA:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Right to know what personal information we collect</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of sale of personal information (we don't sell your data)</li>
                <li>Right to non-discrimination for exercising your rights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy or our data practices, contact us:
              </p>
              <ul className="list-none text-gray-700 space-y-2">
                <li><strong>Email:</strong> privacy@offboardpro.com</li>
                <li><strong>Support:</strong> support@offboardpro.com</li>
                <li><strong>Website:</strong> https://offboarding.vercel.app</li>
              </ul>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                By using OffboardPro, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p>© 2025 OffboardPro. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-blue-600">Terms</Link>
              <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
              <Link href="/cookies" className="hover:text-blue-600">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
