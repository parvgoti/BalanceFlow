import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    if (!error) {
      alert('Check your email for the reset link!')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-8 w-8 rounded-lg bg-brand mx-auto mb-4 flex items-center justify-center text-white text-sm font-bold">🏛️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your email and we'll send a reset link</p>
        </div>
        <div className="card p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="flex h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              id="reset-password-btn"
              type="submit"
              className="w-full h-12 rounded-xl bg-brand text-white font-semibold hover:bg-brand-light transition-colors"
            >
              Send Reset Link
            </button>
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
