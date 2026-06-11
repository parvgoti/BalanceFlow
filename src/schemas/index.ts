import { z } from 'zod'

// ── Auth schemas ──────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
})

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// ── Profile schema ────────────────────────────────────────────
export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(60),
  currency: z.string().length(3, 'Select a currency'),
  timezone: z.string(),
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
})

// ── Group schema ──────────────────────────────────────────────
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(60),
  description: z.string().max(200).optional(),
  currency: z.string().length(3, 'Select a currency').default('INR'),
  member_emails: z
    .array(z.string().email('Invalid email'))
    .max(20, 'Maximum 20 members'),
})

// ── Expense schema ────────────────────────────────────────────
const expenseSplitSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string(),
  avatar_url: z.string().nullable().optional(),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100),
  included: z.boolean(),
})

export const addExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(120),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1_000_000, 'Amount too large'),
  category: z.enum([
    'food', 'travel', 'accommodation', 'entertainment',
    'shopping', 'transport', 'utilities', 'health', 'other',
  ]),
  date: z.string().min(1, 'Date is required'),
  paid_by: z.string().uuid('Select who paid'),
  split_type: z.enum(['equal', 'percentage', 'exact']),
  splits: z.array(expenseSplitSchema).min(1, 'Add at least one participant'),
  notes: z.string().max(500).optional(),
})

// ── Settlement schema ─────────────────────────────────────────
export const settleUpSchema = z.object({
  payer_id: z.string().uuid(),
  payee_id: z.string().uuid(),
  amount: z
    .number()
    .positive('Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'upi', 'card', 'netbanking', 'wallet', 'other']),
  notes: z.string().max(200).optional(),
})

// ── Inferred types ────────────────────────────────────────────
export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
export type CreateGroupFormData = z.infer<typeof createGroupSchema>
export type AddExpenseFormData = z.infer<typeof addExpenseSchema>
export type SettleUpFormData = z.infer<typeof settleUpSchema>
