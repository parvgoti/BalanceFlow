// Send Notification Edge Function
// Deploy: supabase functions deploy send-notification
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface NotificationPayload {
  user_id: string
  type: 'expense_added' | 'expense_updated' | 'settlement' | 'group_invite' | 'reminder'
  title: string
  body: string
  related_id?: string
  group_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
    })
  }

  try {
    const payload: NotificationPayload = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Insert in-app notification
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      related_id: payload.related_id ?? null,
      group_id: payload.group_id ?? null,
    })
    if (notifError) throw notifError

    // Check user email notification preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, email_notifications')
      .eq('id', payload.user_id)
      .single()

    if (profile?.email_notifications && profile.email) {
      // Send email via Resend (or any SMTP provider)
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
      if (RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'BalanceFlow <noreply@balanceflow.app>',
            to: profile.email,
            subject: payload.title,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1A5C38;">BalanceFlow</h1>
                <h2>${payload.title}</h2>
                <p>${payload.body}</p>
                <a href="${Deno.env.get('APP_URL')}" style="background: #2D9D5C; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                  View in App
                </a>
              </div>
            `,
          }),
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
