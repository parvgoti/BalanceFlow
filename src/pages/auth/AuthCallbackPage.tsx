import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search

    // If this callback URL is for password recovery, forward immediately to /reset-password
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      navigate(`/reset-password${hash}${search}`, { replace: true })
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate(`/reset-password${window.location.hash}${window.location.search}`, { replace: true })
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Authenticating…</p>
      </div>
    </div>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email')
  
  const [email, setEmail] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Listen for recovery state or direct link click from email
  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search

    // Check if user landed here via an email recovery link
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setStep('password')
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('password')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Cooldown timer for resending
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Please enter your email address')
      return
    }

    setError(null)
    setIsLoading(true)
    
    // Explicitly pass redirectTo so Supabase generates a valid recovery link
    const redirectUrl = `${window.location.origin}/reset-password`
    const { error: reqError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    })
    
    setIsLoading(false)
    if (reqError) {
      const msg = reqError.message || ''
      if (msg.toLowerCase().includes('recovery email') || reqError.status === 500) {
        setError(
          'Supabase email service could not send the recovery email. This usually happens when the built-in email rate limit (3/hr) is exceeded or Custom SMTP credentials are not configured in your Supabase project settings. Please wait a few minutes or verify your SMTP settings in the Supabase Dashboard.'
        )
      } else {
        setError(msg)
      }
    } else {
      setStep('otp')
      setResendCooldown(60)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    const { error: verError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otpToken.trim(),
      type: 'recovery',
    })
    
    setIsLoading(false)
    if (verError) {
      setError(verError.message || 'Invalid or expired recovery code. Please try again.')
    } else {
      setStep('password')
    }
  }

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    
    setIsLoading(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      // Clear session cleanly so the user can log in with new password
      await supabase.auth.signOut()
      alert('Password updated successfully! You can now log in with your new password.')
      navigate('/login', { replace: true })
    }
  }

  // Step 2: Verification screen (supports both OTP code and direct email link)
  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-brand mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Check your email</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              We sent recovery instructions to <span className="font-semibold text-gray-900 dark:text-white">{email}</span>.
            </p>
          </div>
          <div className="card p-8 space-y-6">
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              💡 <strong>Tip:</strong> If your email contains a <strong>Reset Password button/link</strong>, simply click it to set your password directly. Or, enter the 6-digit code below:
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Input
                id="reset-otp-input"
                label="6-Digit Recovery Code"
                placeholder="123456"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />
              {error && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-900/60 leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                id="verify-reset-otp-btn"
                type="submit"
                className="w-full"
                size="lg"
                loading={isLoading}
                disabled={otpToken.length < 6}
              >
                Verify Code & Set Password
              </Button>
            </form>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep('email')
                }}
                className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change email
              </button>

              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={resendCooldown > 0 || isLoading}
                className="text-brand font-medium hover:underline disabled:opacity-50 disabled:hover:no-underline"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Set New Password
  if (step === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand mx-auto mb-4 flex items-center justify-center text-xl font-bold">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Set New Password</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Enter your new secure password below to complete recovery.
            </p>
          </div>
          <div className="card p-8 space-y-5">
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <Input
                id="new-password-input"
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <Input
                id="confirm-password-input"
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              {error && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-900/60 leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                id="set-new-password-btn"
                type="submit"
                className="w-full"
                size="lg"
                loading={isLoading}
                disabled={newPassword.length < 6 || confirmPassword.length < 6}
              >
                Save New Password
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Request Password Reset
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/logo.png" alt="BalanceFlow" className="h-10 w-10 object-contain" />
            <span className="font-serif font-bold text-2xl text-gray-900 dark:text-white tracking-wide">BalanceFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your account email to receive recovery instructions</p>
        </div>
        <div className="card p-8 space-y-5">
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input
              id="reset-email"
              name="email"
              type="email"
              label="Email Address"
              required
              placeholder="you@example.com"
              value={email}
              leftIcon={<Mail className="h-4 w-4" />}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-900/60 leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <Button
              id="request-reset-otp-btn"
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              Send Recovery Instructions
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link to="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
