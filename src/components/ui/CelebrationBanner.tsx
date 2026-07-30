import { useState, useEffect } from 'react'
import { CheckCircle2, Sparkles, Trophy } from 'lucide-react'

interface CelebrationBannerProps {
  title?: string
  message?: string
  className?: string
}

export function CelebrationBanner({
  title = 'All Settled Up! 🎉',
  message = 'You have zero outstanding balances with anyone in this group.',
  className = '',
}: CelebrationBannerProps) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 dark:from-emerald-950/40 dark:via-teal-950/50 dark:to-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-4 sm:p-5 transition-all duration-300 ${className}`}
    >
      {/* Decorative animated glow and stars */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/20 blur-xl animate-pulse" />
      <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-teal-400/20 blur-xl animate-pulse" />

      <div className="relative z-10 flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
          <Sparkles className="h-6 w-6 animate-spin-slow" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-gray-900 dark:text-white text-base">
              {title}
            </h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              100% Balanced
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-0.5">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
