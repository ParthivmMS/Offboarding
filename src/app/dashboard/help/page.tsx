'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  Shield, 
  Sparkles, 
  Users, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Zap,
  Lock,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
  question: string
  answer: string
  category: string
  tags: string[]
}

const faqs: FAQItem[] = [
  // Getting Started
  {
    question: "What is OffboardPro?",
    answer: "OffboardPro is an employee offboarding automation platform that helps organizations manage the entire exit process. It tracks tasks across departments (IT, HR, Finance), ensures security compliance with app access revocation, and provides AI-powered insights from exit surveys.",
    category: "getting-started",
    tags: ["basics", "overview"]
  },
  {
    question: "How do I create my first offboarding?",
    answer: "Click 'New Offboarding' from the dashboard, fill in employee details (name, email, department, role, last working day), select a template or create custom tasks, and click 'Create Offboarding'. Tasks will be automatically assigned to relevant departments and team members will receive email notifications.",
    category: "getting-started",
    tags: ["offboarding", "tasks", "create"]
  },
  {
    question: "What are templates and should I use them?",
    answer: "Templates are pre-configured task lists for common offboarding scenarios. The 'Standard Employee Exit' template includes tasks for IT (revoke access, collect equipment), HR (final paperwork, exit interview), and Finance (final paycheck). You can use templates as-is or customize them. Create custom templates to save time for recurring offboarding types.",
    category: "getting-started",
    tags: ["templates", "tasks"]
  },
  {
    question: "Do I need to invite team members?",
    answer: "Yes, if you want others to help with offboardings. Invite IT managers to handle tech tasks, HR managers to manage exit surveys, and department managers to oversee their team's tasks. Each member can be assigned specific roles with appropriate permissions.",
    category: "getting-started",
    tags: ["team", "collaboration"]
  },

  // Features
  {
    question: "How do task assignments work?",
    answer: "Tasks are assigned based on the 'Assigned Department' field. When you create an offboarding, tasks marked for 'IT' go to IT team members, 'HR' tasks go to HR managers, etc. Team members receive email notifications when tasks are assigned to them.",
    category: "features",
    tags: ["tasks", "assignments", "departments"]
  },
  {
    question: "Can I track offboarding progress?",
    answer: "Yes! Each offboarding shows a progress bar based on completed tasks. The dashboard displays statistics for total offboardings, in-progress, and completed. You can filter and search offboardings, and click any offboarding to see detailed task status.",
    category: "features",
    tags: ["progress", "tracking", "dashboard"]
  },
  {
    question: "What happens when a task is completed?",
    answer: "When someone marks a task complete, all relevant team members receive an email notification. The offboarding progress bar updates automatically. If all tasks are completed, the offboarding status changes to 'Completed' and a celebration email is sent to the team.",
    category: "features",
    tags: ["tasks", "completion", "notifications"]
  },
  {
    question: "How do I customize task due dates?",
    answer: "When creating or editing tasks, you can set custom due dates for each task. Set IT tasks for day 1, HR tasks for day 3, etc. Tasks turning red indicate they're overdue. Team members receive reminder emails as due dates approach.",
    category: "features",
    tags: ["tasks", "due dates", "reminders"]
  },

  // Security Scanner
  {
    question: "What is the Security Scanner?",
    answer: "The Security Scanner helps you identify and revoke employee access to company applications (Google Workspace, Slack, GitHub, Notion, etc.). When an employee leaves, you can scan for connected apps and bulk-revoke access to prevent security risks.",
    category: "security",
    tags: ["security", "scanner", "access"]
  },
  {
    question: "How do I use the Security Scanner?",
    answer: "Open any offboarding, click 'Scan Security Apps', select the apps the employee had access to (or use 'Select All'), then click 'Revoke All Active'. The system tracks which apps were revoked and maintains an audit log for compliance.",
    category: "security",
    tags: ["security", "scanner", "revoke"]
  },
  {
    question: "Why is security scanning important?",
    answer: "Former employees often retain access to company apps after leaving, creating serious security risks. The Security Scanner ensures all access is properly revoked, protects sensitive data, maintains compliance, and provides an audit trail for security reviews.",
    category: "security",
    tags: ["security", "compliance", "best practices"]
  },
  {
    question: "Can I integrate with Google Workspace or other apps?",
    answer: "Currently, the Security Scanner uses manual selection (you check which apps to revoke). Auto-integration with OAuth APIs (Google, Microsoft, Slack) is planned for a future release. Manual scanning still provides comprehensive security coverage.",
    category: "security",
    tags: ["security", "integrations", "oauth"]
  },

  // AI Insights
  {
    question: "What are AI Exit Insights?",
    answer: "AI Insights analyze exit survey responses to detect turnover patterns, predict churn risks, and recommend retention actions. The AI identifies trends like 'High compensation-related exits in Engineering' and suggests specific improvements.",
    category: "ai-insights",
    tags: ["ai", "insights", "analytics"]
  },
  {
    question: "How many exit surveys do I need for AI analysis?",
    answer: "You need at least 3 completed exit surveys to generate AI insights. More surveys = more accurate insights. The AI analyzes departure reasons, NPS scores, department patterns, and 'would return' percentages to identify actionable trends.",
    category: "ai-insights",
    tags: ["ai", "surveys", "requirements"]
  },
  {
    question: "How do I send exit surveys?",
    answer: "When completing an offboarding, mark the 'Send Exit Survey' task as complete. The system automatically emails a survey link to the departing employee. Surveys expire after 7 days and responses are anonymous and confidential.",
    category: "ai-insights",
    tags: ["surveys", "exit interview", "email"]
  },
  {
    question: "What is the confidence score in AI insights?",
    answer: "The confidence score (0-100%) indicates how reliable the AI's pattern detection is. Higher scores mean stronger evidence. A 95% confidence score based on 20 exits is more reliable than 60% based on 3 exits.",
    category: "ai-insights",
    tags: ["ai", "confidence", "reliability"]
  },
  {
    question: "What is Boomerang Potential?",
    answer: "Boomerang Potential shows the percentage of ex-employees who indicated they'd consider returning to the company. High boomerang potential (60%+) suggests positive culture despite departures. Low potential indicates deeper issues to address.",
    category: "ai-insights",
    tags: ["ai", "boomerang", "retention"]
  },

  // Team & Roles
  {
    question: "What are the different team roles?",
    answer: "Admin (full access, can manage team), HR Manager (create offboardings, invite users, view AI insights), IT Manager (manage IT tasks, access security scanner), Manager (view team offboardings, complete tasks), User (view and complete assigned tasks only).",
    category: "team",
    tags: ["roles", "permissions", "access"]
  },
  {
    question: "How do I invite team members?",
    answer: "Go to Team page, click 'Invite User', enter their email and select a role. They'll receive an invitation email with a link to join. Invitations expire after 7 days. Only Admins and HR Managers can invite users.",
    category: "team",
    tags: ["team", "invitations", "onboarding"]
  },
  {
    question: "Can I change someone's role after inviting them?",
    answer: "Currently, you need to remove the member and re-invite them with the new role. Role editing is planned for a future update. Only Admins can remove team members.",
    category: "team",
    tags: ["team", "roles", "management"]
  },
  {
    question: "What happens if someone leaves our team?",
    answer: "Admins can remove team members from the Team page. Removed members lose access to the organization but their completed tasks remain in the history. Their user account stays active for other organizations they belong to.",
    category: "team",
    tags: ["team", "removal", "offboarding"]
  },

  // Troubleshooting
  {
    question: "I'm not receiving email notifications",
    answer: "Check your spam/junk folder. Emails come from parthivmssince2005@gmail.com. Add this to your contacts. If still not receiving emails, verify your email address is correct in your profile settings.",
    category: "troubleshooting",
    tags: ["email", "notifications", "issues"]
  },
  {
    question: "Why can't I see all offboardings?",
    answer: "You can only see offboardings for your current organization. Use the organization switcher in the sidebar to change organizations. If you're in the wrong org, switch to the correct one.",
    category: "troubleshooting",
    tags: ["organizations", "visibility", "access"]
  },
  {
    question: "Tasks aren't showing up in My Tasks",
    answer: "Tasks only appear if they're assigned to YOUR department. Check the task's 'Assigned Department' field. If you're IT, you'll only see IT tasks. Admins and HR Managers can see all tasks.",
    category: "troubleshooting",
    tags: ["tasks", "visibility", "departments"]
  },
  {
    question: "The AI Insights button is disabled",
    answer: "You need at least 3 completed exit surveys in the last 90 days to run AI analysis. Complete more offboardings with exit surveys, then try again. The button will enable automatically when you have enough data.",
    category: "troubleshooting",
    tags: ["ai", "requirements", "issues"]
  }
]

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getFaqsByCategory = (category: string) => {
    return filteredFaqs.filter(faq => faq.category === category)
  }

  const categories = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen, color: 'blue' },
    { id: 'features', label: 'Features', icon: Zap, color: 'purple' },
    { id: 'security', label: 'Security', icon: Shield, color: 'red' },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, color: 'pink' },
    { id: 'team', label: 'Team & Roles', icon: Users, color: 'green' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertCircle, color: 'orange' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            Help Center
          </h1>
          <p className="text-slate-600 mt-1">
            Everything you need to know about OffboardPro
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/offboardings/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <FileText className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-1">Create Offboarding</h3>
              <p className="text-sm text-slate-600">Start your first employee exit process</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/team">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <Users className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-1">Invite Team</h3>
              <p className="text-sm text-slate-600">Add members to collaborate</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/insights">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <Sparkles className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-slate-900 mb-1">AI Insights</h3>
              <p className="text-sm text-slate-600">Analyze turnover patterns</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search for help... (e.g., 'how to send exit survey')"
              className="pl-10 text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* FAQ Tabs */}
      <Tabs defaultValue="getting-started" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {categories.map(cat => {
            const Icon = cat.icon
            const count = getFaqsByCategory(cat.id).length
            return (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
              >
                <Icon className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">{cat.label}</span>
                <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.id} value={category.id} className="space-y-3 mt-6">
            {getFaqsByCategory(category.id).length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500">No results found for "{searchTerm}"</p>
                  <Button variant="outline" className="mt-4" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Category Description */}
                <Card className="border-2 bg-gradient-to-r from-blue-50 to-purple-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <category.icon className="w-5 h-5" />
                      {category.label}
                    </CardTitle>
                  </CardHeader>
                </Card>

                {/* FAQ Items */}
                {getFaqsByCategory(category.id).map((faq, index) => {
                  const globalIndex = faqs.indexOf(faq)
                  const isExpanded = expandedItems.has(globalIndex)
                  
                  return (
                    <Card key={globalIndex} className="hover:shadow-md transition-shadow">
                      <CardHeader 
                        className="cursor-pointer"
                        onClick={() => toggleItem(globalIndex)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              {faq.question}
                            </CardTitle>
                            {isExpanded && (
                              <CardDescription className="mt-3 text-slate-700 leading-relaxed">
                                {faq.answer}
                              </CardDescription>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-600" />
                            )}
                          </Button>
                        </div>
                        {isExpanded && faq.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {faq.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                  )
                })}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Contact Support */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Mail className="w-5 h-5 text-blue-600" />
            Still Need Help?
          </CardTitle>
          <CardDescription>
            Can't find what you're looking for? We're here to help!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Email Support</p>
                <p className="text-sm text-slate-600">
                  Contact us at <a href="mailto:parthivmssince2005@gmail.com" className="text-blue-600 hover:underline">parthivmssince2005@gmail.com</a>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Response Time</p>
                <p className="text-sm text-slate-600">
                  We typically respond within 24 hours on business days
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Privacy</p>
                <p className="text-sm text-slate-600">
                  All support communications are confidential and secure
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pro Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Zap className="w-5 h-5 text-yellow-600" />
            Pro Tips & Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">Use Templates</p>
                <p className="text-sm text-slate-600">Save time by creating reusable task templates for common offboarding scenarios</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">Security First</p>
                <p className="text-sm text-slate-600">Always run the Security Scanner within 24 hours of employee departure</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">Collect Feedback</p>
                <p className="text-sm text-slate-600">Send exit surveys to all departing employees for valuable AI insights</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 mb-1">Team Collaboration</p>
                <p className="text-sm text-slate-600">Invite department heads to distribute workload and improve accountability</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
