import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Signing you in…</p>
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
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    const { error: reqError } = await supabase.auth.resetPasswordForEmail(email)
    
    setIsLoading(false)
    if (reqError) {
      setError(reqError.message)
    } else {
      setStep('otp')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    const { error: verError } = await supabase.auth.verifyOtp({
      email,
      token: otpToken.trim(),
      type: 'recovery'
    })
    
    setIsLoading(false)
    if (verError) {
      setError(verError.message)
    } else {
      setStep('password')
    }
  }

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    setIsLoading(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      alert('Password updated successfully! You can now log in.')
      navigate('/login')
    }
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-brand mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Check your email</h1>
            <p className="text-gray-500 mt-2">
              We sent a 6-digit recovery code to <span className="font-semibold text-gray-900 dark:text-white">{email}</span>
            </p>
          </div>
          <div className="card p-8 space-y-5">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Input
                id="reset-otp-input"
                label="Recovery Code"
                placeholder="123456"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
                  {error}
                </div>
              )}
              <Button id="verify-reset-otp-btn" type="submit" className="w-full" size="lg" loading={isLoading} disabled={otpToken.length < 6}>
                Verify Code
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-8 w-8 rounded-lg bg-brand mx-auto mb-4 flex items-center justify-center text-white text-sm font-bold">🔒</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Password</h1>
            <p className="text-gray-500 mt-2">
              Enter your new secure password below.
            </p>
          </div>
          <div className="card p-8 space-y-5">
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <Input
                id="new-password-input"
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
                  {error}
                </div>
              )}
              <Button id="set-new-password-btn" type="submit" className="w-full" size="lg" loading={isLoading} disabled={newPassword.length < 6}>
                Save Password
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
          <div className="h-8 w-8 rounded-lg bg-brand mx-auto mb-4 flex items-center justify-center text-white text-sm font-bold">🏛️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your email and we'll send a recovery code</p>
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
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">
                {error}
              </div>
            )}
            <Button
              id="request-reset-otp-btn"
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              Send Recovery Code
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500">
            Remember it?{' '}
            <a href="/login" className="text-brand font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
