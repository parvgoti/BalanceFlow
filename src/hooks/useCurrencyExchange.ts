import { useQuery } from '@tanstack/react-query'

export interface ExchangeRates {
  base: string
  date: string
  rates: Record<string, number>
}

// Fallback rates in case API is offline or rate-limited
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  CAD: 1.36,
  AUD: 1.51,
  JPY: 156.0,
  CNY: 7.24,
  SGD: 1.35,
  CHF: 0.90,
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'CAD', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
  { code: 'CHF', name: 'Swiss Franc (CHF)' },
]

export function useCurrencyExchange(baseCurrency: string = 'USD') {
  return useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    queryFn: async (): Promise<ExchangeRates> => {
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)
        if (!res.ok) throw new Error('Failed to fetch rates')
        const data = await res.json()
        return data
      } catch (err) {
        console.warn('Exchange rate API fallback used:', err)
        // Adjust fallback rates relative to baseCurrency
        const baseVal = FALLBACK_RATES[baseCurrency] || 1
        const adjustedRates: Record<string, number> = {}
        for (const [code, rate] of Object.entries(FALLBACK_RATES)) {
          adjustedRates[code] = Math.round((rate / baseVal) * 10000) / 10000
        }
        return {
          base: baseCurrency,
          date: new Date().toISOString().split('T')[0],
          rates: adjustedRates,
        }
      }
    },
  })
}

/**
 * Convert an amount from fromCurrency to toCurrency using rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates?: Record<string, number>
): { convertedAmount: number; rateUsed: number } {
  if (fromCurrency === toCurrency || !rates) {
    return { convertedAmount: amount, rateUsed: 1 }
  }

  const fromRate = rates[fromCurrency]
  if (!fromRate || fromRate === 0) {
    return { convertedAmount: amount, rateUsed: 1 }
  }

  const rateUsed = 1 / fromRate
  const convertedAmount = Math.round(amount * rateUsed * 100) / 100
  return { convertedAmount, rateUsed: Math.round(rateUsed * 10000) / 10000 }
}
