// Send Notification Edge Function
// Deploy: supabase functions deploy send-notification
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

interface NotificationPayload {
  user_id: string
  type: 'expense_added' | 'expense_updated' | 'settlement' | 'group_invite' | 'reminder'
  title: string
  body: string
  related_id?: string
  group_id?: string
}

serve(async (req: Request) => {
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

    // Web Push Notifications
    const { data: profileForPush } = await supabase
      .from('profiles')
      .select('push_notifications')
      .eq('id', payload.user_id)
      .single()

    if (profileForPush?.push_notifications) {
      const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
      const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          'mailto:support@balanceflow.app',
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        )

        // Fetch all active push subscriptions for the user
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', payload.user_id)

        if (subscriptions && subscriptions.length > 0) {
          const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: Deno.env.get('APP_URL') ?? '/',
          })

          // Send push to all registered devices for this user
          await Promise.all(
            subscriptions.map(async (sub) => {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              }
              try {
                await webpush.sendNotification(pushSubscription, pushPayload)
              } catch (pushErr: any) {
                // If subscription expired or was revoked, delete it
                if (pushErr?.statusCode === 410 || pushErr?.statusCode === 404) {
                  await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('id', sub.id)
                } else {
                  console.error('Web push error:', pushErr)
                }
              }
            })
          )
        }
      } else {
        console.warn('VAPID keys not configured in Edge Function environment')
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
