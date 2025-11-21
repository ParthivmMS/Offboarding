import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, Users, Shield, Sparkles, AlertTriangle, ArrowRight, Check, Zap, Star } from "lucide-react"

export default async function Home() {
  // Check if user is authenticated
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    // User is logged in, redirect to dashboard
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/90">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">OffboardPro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full text-purple-700 font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Security Scanner Included</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-slate-900 leading-tight">
            Stop $4.5M Data Breaches
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Before Ex-Employees Strike
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            OffboardPro's AI finds risky OAuth access in 2 minutes that manual processes miss. 
            Prevent security breaches, save 10 hours per offboarding, stay compliant.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                Start Free 14-Day Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Setup in 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-red-50 border-y border-red-100 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  43% of Companies Have Ex-Employees with Active Access
                </h2>
                <p className="text-lg text-slate-700 mb-6">
                  Manual offboarding misses critical OAuth connections to Google Workspace, Slack, GitHub, and 20+ other apps. 
                  One missed access = potential data breach costing $4.5M on average.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600 mb-1">$4.5M</div>
                    <div className="text-sm text-slate-600">Average breach cost</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600 mb-1">5 Hours</div>
                    <div className="text-sm text-slate-600">Per manual offboarding</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600 mb-1">43%</div>
                    <div className="text-sm text-slate-600">Have ex-employee access</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Everything You Need to Offboard Safely
          </h2>
          <p className="text-xl text-slate-600">
            From AI security scanning to automated workflows
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Security Scanner</h3>
            <p className="text-slate-600">
              AI detects OAuth access to 20+ apps in 2 minutes. One-click revocation.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI Churn Insights</h3>
            <p className="text-slate-600">
              Predict turnover before it happens. Get actionable retention recommendations.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Automated Workflows</h3>
            <p className="text-slate-600">
              Pre-built templates. Auto-assign tasks. Track everything in one place.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Save 10+ Hours</h3>
            <p className="text-slate-600">
              Reduce offboarding from 5 hours to 30 minutes. Email notifications included.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing - ONLY 2 PLANS NOW */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600 mb-12">
              90% cheaper than competitors. No per-user fees.
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Starter */}
              <div className="bg-white p-8 rounded-2xl border-2 border-slate-200">
                <h3 className="font-semibold text-lg mb-2">Starter</h3>
                <div className="text-4xl font-bold mb-4">$79<span className="text-lg text-slate-600">/mo</span></div>
                <p className="text-slate-600 mb-6">For small teams getting started</p>
                <ul className="space-y-3 text-left mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Up to 25 team members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>10 offboardings/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Basic templates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Email notifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Priority email support</span>
                  </li>
                </ul>
                <Link href="/signup">
                  <Button variant="outline" className="w-full">Start Trial</Button>
                </Link>
              </div>

              {/* Professional */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-2xl text-white relative transform scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" />
                  Most Popular
                </div>
                <h3 className="font-semibold text-lg mb-2">Professional</h3>
                <div className="text-4xl font-bold mb-4">$149<span className="text-lg opacity-80">/mo</span></div>
                <p className="opacity-90 mb-6">For growing companies</p>
                <ul className="space-y-3 text-left mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Up to 100 team members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>50 offboardings/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>🔐 Security OAuth Scanner</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>✨ AI Churn Insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>📊 Exit surveys</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link href="/signup">
                  <Button className="w-full bg-white text-blue-600 hover:bg-slate-100">Start Trial</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Stop Security Breaches Before They Start
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join 100+ companies preventing data breaches with OffboardPro
            </p>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-slate-100">
                Start Free 14-Day Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm mt-4 opacity-75">No credit card required • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">OffboardPro</span>
              </div>
              <p className="text-slate-600 text-sm">
                AI-powered employee offboarding platform
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/security">Security</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 text-center text-slate-600 text-sm">
            <p>&copy; 2024 OffboardPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
