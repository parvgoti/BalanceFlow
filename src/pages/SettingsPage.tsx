import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, Camera, Moon, Sun, Monitor } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { UserAvatar } from '@/components/ui/avatar'
import { updateProfileSchema, type UpdateProfileFormData } from '@/schemas'
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications'
import { cn } from '@/lib/utils'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD']
const THEMES = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const { profile, setProfile, signOut } = useAuthStore()
  const { theme, setTheme } = useUIStore()
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      currency: profile?.currency ?? 'INR',
      timezone: profile?.timezone ?? 'UTC',
      email_notifications: profile?.email_notifications ?? true,
      push_notifications: profile?.push_notifications ?? false,
    },
  })

  const emailNotifications = watch('email_notifications')
  const pushNotifications = watch('push_notifications')

  const onSubmit = async (data: UpdateProfileFormData) => {
    if (!profile) return
    try {
      // 1. Update the profiles table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          currency: data.currency,
          timezone: data.timezone,
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
        } as any)
        .eq('id', profile.id)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        setSaveError(error.message)
        setTimeout(() => setSaveError(null), 5000)
        return
      }

      // 2. Also update auth.users metadata so Supabase dashboard stays in sync
      await supabase.auth.updateUser({
        data: { full_name: data.full_name },
      })

      // 3. Handle push notification subscriptions
      if (data.push_notifications && !profile.push_notifications) {
        const subscribed = await subscribeToPushNotifications(profile.id)
        if (!subscribed) {
          // Revert toggle if subscription failed
          data.push_notifications = false
          await supabase.from('profiles').update({ push_notifications: false } as any).eq('id', profile.id)
          setSaveError('Failed to enable push notifications. Check browser permissions.')
        }
      } else if (!data.push_notifications && profile.push_notifications) {
        await unsubscribeFromPushNotifications(profile.id)
      }

      if (updated) {
        setProfile({ ...updated, push_notifications: data.push_notifications } as any)
        setSaveSuccess(true)
        setSaveError(null)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setSaveError('An unexpected error occurred')
      setTimeout(() => setSaveError(null), 5000)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setAvatarLoading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        await supabase
          .from('profiles')
          .update({ avatar_url: urlData.publicUrl } as any)
          .eq('id', profile.id)
        setProfile({ ...profile, avatar_url: urlData.publicUrl })
      }
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 px-4 py-5 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <UserAvatar
            name={profile?.full_name ?? 'User'}
            avatarUrl={profile?.avatar_url}
            userId={profile?.id ?? ''}
            className="h-16 w-16 text-xl"
          />
          <label
            htmlFor="avatar-upload"
            className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-brand text-white flex items-center justify-center cursor-pointer shadow-md"
          >
            {avatarLoading ? (
              <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
            />
          </label>
        </div>
        <div>
          <h2 className="text-xl font-bold text-navy dark:text-white leading-none">{profile?.full_name}</h2>
          <p className="text-sm text-gray-500 mt-1">{profile?.email}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[16px] p-4 flex flex-col justify-center shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
            Total settled
          </p>
          <p className="text-xl font-extrabold text-navy dark:text-white leading-none">
            ₹46.00
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[16px] p-4 flex flex-col justify-center shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
            Groups joined
          </p>
          <p className="text-xl font-extrabold text-navy dark:text-white leading-none">
            1
          </p>
        </div>
      </div>

      {/* Premium Banner */}
      <div className="bg-navy dark:bg-gray-900 rounded-[20px] p-5 text-white flex flex-col items-start mb-6 shadow-lg">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-1.5">
          <span className="text-xl leading-none">🌟</span> Upgrade to Premium
        </h3>
        <p className="text-xs text-white/70 mb-4">
          Unlock unlimited groups and advanced analytics
        </p>
        <button className="bg-[#107C41] hover:bg-[#15803D] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
          Upgrade now
        </button>
      </div>

      {/* Menu List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        
        {/* Quick Settings Form */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">Preferences</p>
          <div className="card divide-y divide-gray-50 dark:divide-gray-800">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-navy dark:text-white">Push Notifications</p>
                <p className="text-[11px] text-gray-400">Receive alerts on your device</p>
              </div>
              <Switch
                id="push-notifications-toggle"
                checked={pushNotifications}
                onCheckedChange={async (v) => {
                  setValue('push_notifications', v, { shouldDirty: true })
                  await handleSubmit(onSubmit)()
                }}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-navy dark:text-white">Default Currency</p>
                <p className="text-[11px] text-gray-400">Your primary tracking currency</p>
              </div>
              <select
                id="settings-currency-select"
                className="h-8 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs font-medium text-navy dark:text-white px-2 border-none outline-none focus:ring-2 focus:ring-brand"
                {...register('currency')}
                onChange={async (e) => {
                  setValue('currency', e.target.value, { shouldDirty: true })
                  await handleSubmit(onSubmit)()
                }}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">Appearance</p>
          <div className="card p-3">
            <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                    theme === t.value
                      ? "bg-white dark:bg-gray-900 text-brand shadow-sm"
                      : "text-gray-500 hover:text-navy dark:hover:text-white"
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="mt-6">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center py-3.5 rounded-[14px] bg-red-50 dark:bg-red-950 hover:bg-red-100 transition-colors"
          >
            <span className="text-[13px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Log Out</span>
          </button>
        </div>
        
        {saveError && (
          <p className="text-xs text-red-500 text-center font-medium px-4">{saveError}</p>
        )}
      </div>
    </div>
  )
}
