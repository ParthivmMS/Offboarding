import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function CookiesPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: November 13, 2025</p>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-gray-700 mb-8">
              This Cookie Policy explains how OffboardPro uses cookies and similar technologies to recognize you when you visit our website and use our service.
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Are Cookies?</h2>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember your preferences and provide a better user experience.
              </p>
              <p className="text-gray-700">
                Cookies can be "persistent" (remain after you close your browser) or "session" (deleted when you close your browser).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Cookies</h2>
              <p className="text-gray-700 mb-4">
                OffboardPro uses cookies for the following purposes:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.1 Essential Cookies (Required)</h3>
              <p className="text-gray-700 mb-4">
                These cookies are necessary for the Service to function:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Authentication:</strong> Keep you logged in to your account</li>
                <li><strong>Security:</strong> Protect against fraud and unauthorized access</li>
                <li><strong>Session Management:</strong> Remember your current organization and preferences</li>
              </ul>
              <p className="text-gray-700">
                <em>These cookies cannot be disabled without affecting how our Service works.</em>
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.2 Performance Cookies (Optional)</h3>
              <p className="text-gray-700 mb-4">
                These cookies help us understand how you use our Service:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Analytics:</strong> Track page views, feature usage, and user behavior</li>
                <li><strong>Error Tracking:</strong> Identify and fix bugs</li>
                <li><strong>Performance Monitoring:</strong> Measure page load times</li>
              </ul>
              <p className="text-gray-700">
                <em>You can opt-out of these cookies through your browser settings.</em>
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.3 Functional Cookies (Optional)</h3>
              <p className="text-gray-700 mb-4">
                These cookies enhance your experience:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Preferences:</strong> Remember your language, timezone, theme</li>
                <li><strong>UI State:</strong> Remember sidebar collapse state, table sorting</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Cookies We Use</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 mb-6">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">Cookie Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr className="border-b">
                      <td className="px-4 py-3 text-sm text-gray-700">sb-access-token</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Authentication session</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Essential</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Session</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3 text-sm text-gray-700">sb-refresh-token</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Keep you logged in</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Essential</td>
                      <td className="px-4 py-3 text-sm text-gray-700">7 days</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3 text-sm text-gray-700">_ga</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Google Analytics tracking</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Performance</td>
                      <td className="px-4 py-3 text-sm text-gray-700">2 years</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3 text-sm text-gray-700">_gid</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Google Analytics session</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Performance</td>
                      <td className="px-4 py-3 text-sm text-gray-700">24 hours</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-700">theme</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Remember dark/light mode</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Functional</td>
                      <td className="px-4 py-3 text-sm text-gray-700">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Third-Party Cookies</h2>
              <p className="text-gray-700 mb-4">
                We use third-party services that may set their own cookies:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Google Analytics:</strong> For usage analytics and insights</li>
                <li><strong>Stripe:</strong> For payment processing (only on payment pages)</li>
                <li><strong>Vercel:</strong> For hosting and performance monitoring</li>
              </ul>
              <p className="text-gray-700">
                These third parties have their own privacy policies and cookie policies. We do not control these cookies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. How to Manage Cookies</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">5.1 Browser Settings</h3>
              <p className="text-gray-700 mb-4">
                Most browsers allow you to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>View cookies stored on your device</li>
                <li>Delete cookies</li>
                <li>Block cookies from specific websites</li>
                <li>Block all cookies (may affect website functionality)</li>
              </ul>
              
              <p className="text-gray-700 mb-4">
                Learn how to manage cookies in your browser:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-view-allow-block-delete-and-use-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Microsoft Edge</a></li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">5.2 Opt-Out Tools</h3>
              <p className="text-gray-700 mb-4">
                You can opt-out of analytics cookies:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Analytics Opt-out</a></li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Do Not Track Signals</h2>
              <p className="text-gray-700">
                Some browsers have a "Do Not Track" feature. At this time, we do not respond to Do Not Track signals. However, you can control cookies through your browser settings as described above.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Mobile Devices</h2>
              <p className="text-gray-700 mb-4">
                Mobile apps may use device identifiers instead of cookies. You can control these through your device settings:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>iOS:</strong> Settings → Privacy → Tracking</li>
                <li><strong>Android:</strong> Settings → Google → Ads</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Cookie Policy from time to time. The "Last updated" date will reflect the most recent changes. We encourage you to review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about our use of cookies, please contact us:
              </p>
              <ul className="list-none text-gray-700 space-y-2">
                <li><strong>Email:</strong> privacy@offboardpro.com</li>
                <li><strong>Support:</strong> support@offboardpro.com</li>
                <li><strong>Website:</strong> https://offboarding.vercel.app</li>
              </ul>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                By continuing to use OffboardPro, you consent to our use of cookies as described in this Cookie Policy.
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
