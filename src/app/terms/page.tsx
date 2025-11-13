import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: November 13, 2025</p>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              Welcome to OffboardPro. By using our service, you agree to these terms. Please read them carefully.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using OffboardPro ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                OffboardPro provides employee offboarding automation software as a service ("SaaS"). Our platform helps organizations manage employee departures, automate tasks, revoke access, and maintain compliance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-700 mb-4">
                To use our Service, you must:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Create an account with accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Be at least 18 years old or the age of majority in your jurisdiction</li>
                <li>Not share your account with others</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
              <p className="text-gray-700">
                You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription and Payment</h2>
              <p className="text-gray-700 mb-4">
                <strong>4.1 Free Trial:</strong> We offer a 14-day free trial. No credit card is required for the trial period.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>4.2 Paid Plans:</strong> After the trial period, you must subscribe to a paid plan to continue using the Service.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>4.3 Billing:</strong> Subscription fees are billed monthly or annually in advance. All fees are non-refundable except as required by law.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>4.4 Price Changes:</strong> We may change our pricing with 30 days' notice. Changes will not affect your current billing cycle.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>4.5 Cancellation:</strong> You may cancel your subscription at any time. Your access will continue until the end of your current billing period.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">
                You agree NOT to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Use the Service for any illegal purpose</li>
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit malware, viruses, or harmful code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service to spam or harass others</li>
                <li>Scrape, copy, or reverse engineer the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data and Privacy</h2>
              <p className="text-gray-700 mb-4">
                <strong>6.1 Your Data:</strong> You retain all rights to data you submit to the Service. We do not claim ownership of your data.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>6.2 Data Security:</strong> We implement industry-standard security measures to protect your data. However, no system is 100% secure.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>6.3 Privacy Policy:</strong> Our collection and use of personal information is governed by our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>6.4 Data Backup:</strong> You are responsible for maintaining your own backup of your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                The Service, including all content, features, and functionality, is owned by OffboardPro and is protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-gray-700">
                You are granted a limited, non-exclusive, non-transferable license to use the Service for its intended purpose.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Service Availability</h2>
              <p className="text-gray-700 mb-4">
                We strive to provide 99.9% uptime but do not guarantee uninterrupted access. We may:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Perform scheduled maintenance with notice</li>
                <li>Modify or discontinue features</li>
                <li>Suspend access for violations of these Terms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimers</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>The Service will meet your specific requirements</li>
                <li>The Service will be uninterrupted, timely, or error-free</li>
                <li>Results obtained from the Service will be accurate or reliable</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, OFFBOARDPRO SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Any indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Damages exceeding the amount you paid us in the last 12 months</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold OffboardPro harmless from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account immediately, without notice, for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Violation of these Terms</li>
                <li>Non-payment of fees</li>
                <li>Fraudulent or illegal activity</li>
              </ul>
              <p className="text-gray-700">
                Upon termination, your right to use the Service will immediately cease. You may export your data within 30 days of termination.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to Terms</h2>
              <p className="text-gray-700">
                We may update these Terms from time to time. We will notify you of material changes via email or through the Service. Your continued use after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Governing Law</h2>
              <p className="text-gray-700">
                These Terms are governed by the laws of the jurisdiction in which OffboardPro operates, without regard to conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <ul className="list-none text-gray-700 space-y-2">
                <li><strong>Email:</strong> support@offboardpro.com</li>
                <li><strong>Website:</strong> https://offboarding.vercel.app</li>
              </ul>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                By using OffboardPro, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
