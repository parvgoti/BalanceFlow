import { supabase } from './supabase'

// Base64 to Uint8Array converter needed for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeToPushNotifications(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported by this browser')
    }

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready

    // Get the VAPID public key from env
    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!publicVapidKey) {
      throw new Error('VAPID public key is missing from environment variables')
    }

    // Subscribe to push service
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    })

    const subJson = subscription.toJSON()
    
    // Save to Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      }, { onConflict: 'user_id, endpoint' })

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return false
  }
}

export async function unsubscribeFromPushNotifications(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return true // Nothing to unsubscribe from
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      const endpoint = subscription.endpoint
      
      // Unsubscribe locally
      await subscription.unsubscribe()
      
      // Delete from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
    }

    return true
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return false
  }
}
