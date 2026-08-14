import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto flex flex-col h-full bg-white dark:bg-gray-950">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy dark:text-white">Calendar</h1>
      </div>

      <div className="card p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-bold text-navy dark:text-white">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square flex items-center justify-center font-medium text-navy dark:text-white rounded-lg hover:bg-gray-50 cursor-pointer">
              {(i % 31) + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
