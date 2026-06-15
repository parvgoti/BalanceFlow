export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          currency: string
          timezone: string
          email_notifications: boolean
          push_notifications: boolean
          is_pro: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          image_url: string | null
          currency: string
          created_by: string
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_archived'>
        Update: Partial<Database['public']['Tables']['groups']['Insert']>
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['group_members']['Row'], 'id' | 'joined_at'>
        Update: Partial<Database['public']['Tables']['group_members']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          group_id: string
          paid_by: string
          amount: number
          description: string
          category: ExpenseCategory
          date: string
          receipt_url: string | null
          notes: string | null
          split_type: SplitType
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_deleted'>
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          amount: number
          percentage: number | null
          is_settled: boolean
          settled_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['expense_splits']['Row'], 'id' | 'created_at' | 'is_settled' | 'settled_at'>
        Update: Partial<Database['public']['Tables']['expense_splits']['Insert']>
      }
      settlements: {
        Row: {
          id: string
          group_id: string
          payer_id: string
          payee_id: string
          amount: number
          payment_method: PaymentMethod
          notes: string | null
          created_by: string
          settled_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['settlements']['Row'], 'id' | 'created_at' | 'settled_at'>
        Update: Partial<Database['public']['Tables']['settlements']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          body: string
          is_read: boolean
          related_id: string | null
          group_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'is_read'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
    }
    Views: {
      group_balances: {
        Row: {
          group_id: string
          user_id: string
          full_name: string
          avatar_url: string | null
          net_balance: number
        }
      }
      activity_feed: {
        Row: {
          type: 'expense' | 'settlement' | 'deleted_expense'
          id: string
          group_id: string
          group_name: string
          title: string
          amount: number
          category: string
          actor_name: string
          actor_avatar: string | null
          created_at: string
        }
      }
    }
    Functions: Record<string, never>
  }
}

// ── Domain types ─────────────────────────────────────────────

export type ExpenseCategory =
  | 'food'
  | 'travel'
  | 'accommodation'
  | 'entertainment'
  | 'shopping'
  | 'transport'
  | 'utilities'
  | 'health'
  | 'other'

export type SplitType = 'equal' | 'percentage' | 'exact'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'venmo' | 'cashapp' | 'paypal' | 'other'

export type NotificationType =
  | 'expense_added'
  | 'expense_updated'
  | 'settlement'
  | 'group_invite'
  | 'reminder'

// ── Convenience aliases ──────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseSplit = Database['public']['Tables']['expense_splits']['Row']
export type Settlement = Database['public']['Tables']['settlements']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type GroupBalance = Database['public']['Views']['group_balances']['Row']
export type ActivityItem = Database['public']['Views']['activity_feed']['Row']

// ── Extended / joined types ──────────────────────────────────

export interface GroupWithMembers extends Group {
  group_members: (GroupMember & { profiles: Profile })[]
  totalBalance?: number
  memberCount?: number
}

export interface ExpenseWithSplits extends Expense {
  expense_splits: (ExpenseSplit & { profiles: Profile })[]
  payer?: Profile
}

export interface SettlementWithProfiles extends Settlement {
  payer: Profile
  payee: Profile
}

export interface SimplifiedTransaction {
  from_user_id: string
  from_user_name: string
  to_user_id: string
  to_user_name: string
  amount: number
}

// ── Form types ───────────────────────────────────────────────

export interface ExpenseSplitInput {
  user_id: string
  full_name: string
  avatar_url?: string | null
  amount: number
  percentage: number
  included: boolean
}

export interface AddExpenseFormData {
  description: string
  amount: number
  category: ExpenseCategory
  date: string
  paid_by: string
  split_type: SplitType
  splits: ExpenseSplitInput[]
  notes?: string
  receipt?: File
}

export interface CreateGroupFormData {
  name: string
  description?: string
  currency: string
  member_emails: string[]
}

export interface SettleUpFormData {
  to_user_id: string
  amount: number
  payment_method: PaymentMethod
  notes?: string
}
