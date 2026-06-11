import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts'
import { CATEGORY_CONFIG, formatCurrency } from '@/lib/utils'
import type { ExpenseCategory } from '@/types/database'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
        <p className="font-bold text-gray-900 dark:text-white text-xs mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500 dark:text-gray-400">{entry.name}:</span>
            <span className="font-bold text-gray-900 dark:text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ── Category Breakdown Pie ─────────────────────────────────────
interface CategoryData {
  category: ExpenseCategory
  total: number
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316']

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  const chartData = data.map(d => ({
    name: CATEGORY_CONFIG[d.category]?.label ?? d.category,
    value: d.total,
    icon: CATEGORY_CONFIG[d.category]?.icon ?? '📦',
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Total']}
          content={<CustomTooltip />}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Spending Over Time Line ────────────────────────────────────
interface SpendingData {
  month: string
  amount: number
}

export function SpendingTrendChart({ data, currency = 'INR' }: { data: SpendingData[], currency?: string }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
        <defs>
          <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, currency, true)} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [formatCurrency(Number(v) || 0, currency), 'Spent']}
          content={<CustomTooltip />}
          cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#22c55e"
          strokeWidth={2.5}
          fill="url(#spendingGradient)"
          dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Balance Bar Chart ──────────────────────────────────────────
interface BalanceData {
  name: string
  owed: number
  owes: number
}

export function BalanceBarChart({ data, currency = 'INR' }: { data: BalanceData[], currency?: string }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 15, bottom: 5 }} barSize={16}>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, currency, true)} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [formatCurrency(Number(v) || 0, currency)]}
          content={<CustomTooltip />}
          cursor={{ fill: '#22c55e', opacity: 0.2 }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="owed" name="Owed to you" fill="#22c55e" radius={[6, 6, 0, 0]} />
        <Bar dataKey="owes" name="You owe" fill="#ef4444" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Top Categories List ────────────────────────────────────────
export function TopCategoriesList({ data }: { data: CategoryData[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((item, i) => {
        const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other
        const pct = (item.total / max) * 100
        return (
          <div key={item.category} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                <span>{cfg.icon}</span>
                {cfg.label}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
