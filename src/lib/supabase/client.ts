import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Database types
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          google_workspace_connected: boolean
          google_workspace_domain: string | null
          subscription_status: string
          settings: any
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          google_workspace_connected?: boolean
          google_workspace_domain?: string | null
          subscription_status?: string
          settings?: any
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          google_workspace_connected?: boolean
          google_workspace_domain?: string | null
          subscription_status?: string
          settings?: any
        }
      }
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          name: string
          role: 'admin' | 'hr_manager' | 'it_manager' | 'manager' | 'user'
          organization_id: string
          created_at: string
          last_login_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          name: string
          role: 'admin' | 'hr_manager' | 'it_manager' | 'manager' | 'user'
          organization_id: string
          created_at?: string
          last_login_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          name?: string
          role?: 'admin' | 'hr_manager' | 'it_manager' | 'manager' | 'user'
          organization_id?: string
          created_at?: string
          last_login_at?: string | null
          is_active?: boolean
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          role_type: string | null
          description: string | null
          organization_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          role_type?: string | null
          description?: string | null
          organization_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          role_type?: string | null
          description?: string | null
          organization_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
      }
      template_tasks: {
        Row: {
          id: string
          template_id: string
          task_name: string
          description: string | null
          assigned_department: string
          due_date_offset: number
          priority: 'High' | 'Medium' | 'Low'
          category: string
          order_index: number
          instructions: string | null
          created_at: string
        }
      }
      offboardings: {
        Row: {
          id: string
          organization_id: string
          employee_name: string
          employee_email: string
          department: string
          role: string
          last_working_day: string
          manager_name: string | null
          manager_email: string | null
          reason_for_departure: string | null
          template_id: string | null
          status: 'in_progress' | 'completed' | 'cancelled'
          created_by: string
          created_at: string
          completed_at: string | null
          notes: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          offboarding_id: string
          task_name: string
          description: string | null
          instructions: string | null
          assigned_to: string | null
          assigned_department: string
          due_date: string
          priority: 'High' | 'Medium' | 'Low'
          category: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          notes: string | null
          order_index: number
          created_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          type: string
          read: boolean
          related_task_id: string | null
          related_offboarding_id: string | null
          created_at: string
        }
      }
    }
  }
}
