import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signupSchema, type SignupFormData } from '@/schemas'

export function SignupPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (data: SignupFormData) => {
    setAuthError(null)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setAuthError(error.message)
    } else {
      setSignupEmail(data.email)
      setSuccess(true)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError(null)
    setIsVerifying(true)
    
    const { error } = await supabase.auth.verifyOtp({
      email: signupEmail,
      token: otpToken.trim(),
      type: 'signup'
    })
    
    setIsVerifying(false)
    
    if (error) {
      setOtpError(error.message)
    } else {
      // Successfully verified and logged in
      navigate('/')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Verify your email</h1>
            <p className="text-gray-500 mt-2">
              We sent a 6-digit code to <span className="font-semibold text-gray-900 dark:text-white">{signupEmail}</span>
            </p>
          </div>

          <div className="card p-8 space-y-5">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Input
                id="otp-input"
                label="Verification Code"
                placeholder="123456"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />

              {otpError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
                  {otpError}
                </div>
              )}

              <Button id="verify-otp-btn" type="submit" className="w-full" size="lg" loading={isVerifying} disabled={otpToken.length < 6}>
                Verify Code
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">🏛️</div>
            <span className="font-bold text-xl text-brand">BalanceFlow</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-gray-500 mt-1">Start splitting expenses effortlessly</p>
        </div>

        <div className="card p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="signup-name-input"
              label="Full Name"
              placeholder="Jordan Taylor"
              leftIcon={<User className="h-4 w-4" />}
              error={errors.full_name?.message}
              {...register('full_name')}
            />
            <Input
              id="signup-email-input"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="signup-password-input"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              id="signup-confirm-password-input"
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {authError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
                {authError}
              </div>
            )}

            <Button id="signup-submit-btn" type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
