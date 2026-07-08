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

      if (updated) {
        setProfile(updated as any)
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account details and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="card p-6 flex flex-col items-center gap-4">
          <div className="relative">
            <UserAvatar
              name={profile?.full_name ?? 'User'}
              avatarUrl={profile?.avatar_url}
              userId={profile?.id ?? ''}
              size="xl"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-brand text-white flex items-center justify-center cursor-pointer hover:bg-brand-light transition-colors shadow-md"
            >
              {avatarLoading ? (
                <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
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
          <div className="text-center">
            <p className="font-bold text-gray-900 dark:text-white text-lg">
              {profile?.full_name}
            </p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            {profile?.is_pro && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-brand-subtle text-brand text-xs font-bold uppercase tracking-wider">
                Pro Member
              </span>
            )}
          </div>
        </div>

        {/* Settings form */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
            <Input
              id="settings-name-input"
              label="Display Name"
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Default Currency
              </label>
              <select
                id="settings-currency-select"
                className="flex h-11 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                {...register('currency')}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Notifications */}
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notifications</p>
                  <p className="text-xs text-gray-500">Receive alerts for new expenses</p>
                </div>
                <Switch
                  id="email-notifications-toggle"
                  checked={emailNotifications}
                  onCheckedChange={v => setValue('email_notifications', v, { shouldDirty: true })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Push Notifications</p>
                  <p className="text-xs text-gray-500">Browser push alerts</p>
                </div>
                <Switch
                  id="push-notifications-toggle"
                  checked={pushNotifications}
                  onCheckedChange={v => setValue('push_notifications', v, { shouldDirty: true })}
                />
              </div>
            </div>

            {saveSuccess && (
              <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-200 dark:border-emerald-800">
                ✓ Settings saved successfully
              </div>
            )}

            {saveError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
                ✗ {saveError}
              </div>
            )}

            <Button
              id="settings-save-btn"
              type="submit"
              loading={isSubmitting}
              disabled={!isDirty}
              className="w-full"
            >
              Save Changes
            </Button>
          </form>

          {/* Theme */}
          <div className="card p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Appearance</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  id={`theme-${t.value}-btn`}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    theme === t.value
                      ? 'border-brand bg-brand-subtle dark:bg-brand-dark/20 text-brand'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <t.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="card p-6">
            <button
              id="sign-out-btn"
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
