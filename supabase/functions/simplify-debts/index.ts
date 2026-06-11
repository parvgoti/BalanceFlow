// Debt simplification Edge Function
// Deploy: supabase functions deploy simplify-debts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UserBalance {
  user_id: string
  full_name: string
  avatar_url: string | null
  net_balance: number
}

interface Transaction {
  from_user_id: string
  from_user_name: string
  to_user_id: string
  to_user_name: string
  amount: number
}

/**
 * Debt Simplification Algorithm (Greedy / Splitwise approach)
 * 1. Compute net balance per user (amount owed - amount owing)
 * 2. Split into creditors (net > 0) and debtors (net < 0)
 * 3. Greedily match largest debtor → largest creditor
 * Result: minimum number of transactions
 */
function simplifyDebts(balances: UserBalance[]): Transaction[] {
  const transactions: Transaction[] = []

  // Filter out zero balances
  const creditors = balances
    .filter(b => b.net_balance > 0.01)
    .map(b => ({ ...b, remaining: b.net_balance }))
    .sort((a, b) => b.remaining - a.remaining)

  const debtors = balances
    .filter(b => b.net_balance < -0.01)
    .map(b => ({ ...b, remaining: Math.abs(b.net_balance) }))
    .sort((a, b) => b.remaining - a.remaining)

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.remaining, debtor.remaining)

    if (amount > 0.01) {
      transactions.push({
        from_user_id: debtor.user_id,
        from_user_name: debtor.full_name,
        to_user_id: creditor.user_id,
        to_user_name: creditor.full_name,
        amount: Math.round(amount * 100) / 100,
      })
    }

    creditor.remaining -= amount
    debtor.remaining -= amount

    if (creditor.remaining < 0.01) ci++
    if (debtor.remaining < 0.01) di++
  }

  return transactions
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { group_id } = await req.json()
    if (!group_id) throw new Error('group_id is required')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get net balances for this group
    const { data: balances, error } = await supabaseClient
      .from('group_balances')
      .select('user_id, full_name, avatar_url, net_balance')
      .eq('group_id', group_id)

    if (error) throw error

    const transactions = simplifyDebts(balances as UserBalance[])

    return new Response(JSON.stringify({ transactions, total: transactions.length }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
