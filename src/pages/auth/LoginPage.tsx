import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { z } from 'zod'

// Define schema inline to avoid resolver generic mismatch with optional fields
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
})
type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setAuthError(error.message)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 xl:px-24 py-12">
        {/* Logo */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="BalanceFlow" className="h-10 w-10 object-contain" />
            <span className="font-serif font-bold text-2xl text-gray-900 dark:text-white tracking-wide">BalanceFlow</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account to continue.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="login-email-input"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="login-password-input"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-gray-600 transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-brand" {...register('rememberMe')} />
              Remember me
            </label>
            <Link to="/reset-password" className="text-sm text-brand hover:underline font-medium">
              Forgot password?
            </Link>
          </div>

          {authError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
              {authError}
            </div>
          )}

          <Button id="login-submit-btn" type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand font-semibold hover:underline">Sign up</Link>
        </p>
      </div>

      {/* Right: Illustration */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand to-primary-700 items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 text-left border border-white/20 shadow-modal">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-xl">💳</div>
              <div>
                <p className="font-semibold text-white">Dinner Split</p>
                <p className="text-sm text-white/60">Settled yesterday</p>
              </div>
              <span className="ml-auto text-emerald-300 font-bold">+$45.00</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-1">
              <div className="bg-white h-2 rounded-full w-full" />
            </div>
            <p className="text-xs text-white/60 text-right">100% SETTLED</p>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Financial Zen for Professionals
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Effortlessly track expenses, settle debts, and manage shared costs with pristine clarity. No cognitive load, just pure financial balance.
          </p>
        </div>
      </div>
    </div>
  )
}
