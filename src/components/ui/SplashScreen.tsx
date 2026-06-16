import { useEffect, useState } from 'react'

export function SplashScreen({ isLoading }: { isLoading: boolean }) {
  const [show, setShow] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setFadeOut(true)
      const timer = setTimeout(() => setShow(false), 500) // Match the fade-out duration
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (!show) return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="relative flex flex-col items-center">
        {/* Glowing background effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-brand/20 rounded-full blur-3xl animate-pulse" />
        
        {/* Logo */}
        <div className="relative mb-6 animate-bounce-slow">
          <img 
            src="/logo.png" 
            alt="BalanceFlow" 
            className="w-24 h-24 object-contain drop-shadow-2xl" 
          />
        </div>

        {/* Text */}
        <div className="text-center space-y-2 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <h1 className="text-3xl font-bold text-white tracking-tight">BalanceFlow</h1>
          <p className="text-gray-400 font-medium">Smart Expense Sharing</p>
        </div>
      </div>
    </div>
  )
}
