import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, Camera, Moon, Sun, Monitor, User } from 'lucide-react'
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

  const [activeSection, setActiveSection] = useState<string | null>(null)
  const toggleSection = (section: string) => setActiveSection(s => s === section ? null : section)

  const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("text-gray-400 transition-transform", isOpen && "rotate-90")}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F7F9FC] dark:bg-gray-950 px-4 pt-12 pb-24 max-w-lg mx-auto w-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6 px-1">
        <button className="text-navy dark:text-white shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800 p-1.5 rounded-full transition-colors" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-[22px] font-extrabold text-navy dark:text-white">More</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-800 p-2 space-y-1">
        
        {/* Profile */}
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 transition-colors">
          <button onClick={() => toggleSection('profile')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500">
                <User className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-[15px] font-bold text-navy dark:text-white leading-tight">Profile</p>
                <p className="text-[13px] text-gray-500 font-medium">Manage your account</p>
              </div>
            </div>
            <ChevronIcon isOpen={activeSection === 'profile'} />
          </button>
          
          {activeSection === 'profile' && (
            <div className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="relative">
                  <UserAvatar name={profile?.full_name ?? 'User'} avatarUrl={profile?.avatar_url} userId={profile?.id ?? ''} className="h-16 w-16 text-xl" />
                  <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-brand text-white flex items-center justify-center cursor-pointer shadow-md">
                    {avatarLoading ? <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Camera className="h-3 w-3" />}
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarLoading} />
                  </label>
                </div>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input id="full_name" label="Full Name" error={errors.full_name?.message} {...register('full_name')} />
                <Button type="submit" loading={isSubmitting} disabled={!isDirty} className="w-full">Save Profile</Button>
                {saveSuccess && <p className="text-sm text-green-600 text-center">Profile updated!</p>}
                {saveError && <p className="text-sm text-red-600 text-center">{saveError}</p>}
              </form>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 transition-colors">
          <button onClick={() => toggleSection('settings')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <div className="text-left">
                <p className="text-[15px] font-bold text-navy dark:text-white leading-tight">Settings</p>
                <p className="text-[13px] text-gray-500 font-medium">App preferences</p>
              </div>
            </div>
            <ChevronIcon isOpen={activeSection === 'settings'} />
          </button>

          {activeSection === 'settings' && (
            <div className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2 space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-navy dark:text-white">Email Notifications</h3>
                    <p className="text-xs text-gray-500">Get updates about your groups via email</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={(val) => { setValue('email_notifications', val, { shouldDirty: true }); handleSubmit(onSubmit)(); }} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-navy dark:text-white">Push Notifications</h3>
                    <p className="text-xs text-gray-500">Enable browser notifications</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={(val) => { setValue('push_notifications', val, { shouldDirty: true }); handleSubmit(onSubmit)(); }} />
                </div>
                {saveSuccess && <p className="text-sm text-green-600 text-center">Settings saved!</p>}
                {saveError && <p className="text-sm text-red-600 text-center">{saveError}</p>}
              </form>
            </div>
          )}
        </div>

        {/* Invite Friends */}
        <button onClick={() => {
          if (navigator.share) {
            navigator.share({ title: 'BalanceFlow', text: 'Join me on BalanceFlow to track our shared expenses!', url: window.location.origin })
          } else {
            alert('Share feature is not supported in this browser.')
          }
        }} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
            </div>
            <div className="text-left">
              <p className="text-[15px] font-bold text-navy dark:text-white leading-tight">Invite Friends</p>
              <p className="text-[13px] text-gray-500 font-medium">Add friends to BalanceFlow</p>
            </div>
          </div>
          <ChevronIcon isOpen={false} />
        </button>

        {/* Help & Support */}
        <button onClick={() => window.open('mailto:no.reply.conf.test.app@gmail.com')} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            </div>
            <div className="text-left">
              <p className="text-[15px] font-bold text-navy dark:text-white leading-tight">Help & Support</p>
              <p className="text-[13px] text-gray-500 font-medium">Get help and contact us</p>
            </div>
          </div>
          <ChevronIcon isOpen={false} />
        </button>

        {/* Change Currency */}
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 transition-colors">
          <button onClick={() => toggleSection('currency')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div className="text-left">
                <p className="text-[15px] font-bold text-navy dark:text-white leading-tight">Change Currency</p>
                <p className="text-[13px] text-gray-500 font-medium">Currency: {profile?.currency ?? 'INR'}</p>
              </div>
            </div>
            <ChevronIcon isOpen={activeSection === 'currency'} />
          </button>

          {activeSection === 'currency' && (
            <div className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <select
                    className="w-full h-11 px-3 rounded-[12px] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#107C41]/30 focus:border-[#107C41] transition-colors"
                    {...register('currency')}
                    onChange={(e) => { setValue('currency', e.target.value, { shouldDirty: true }); handleSubmit(onSubmit)(); }}
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Data & Export */}
        <button onClick={() => alert('Data export feature coming soon!')} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </div>
            <div className="text-left">
              <p className="text-[15px] font-bold text-navy dark:text-white leading-tight">Data & Export</p>
              <p className="text-[13px] text-gray-500 font-medium">Export your data</p>
            </div>
          </div>
          <ChevronIcon isOpen={false} />
        </button>

        {/* Appearance */}
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 transition-colors">
          <button onClick={() => toggleSection('appearance')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              </div>
              <div className="text-left">
                <p className="text-[15px] font-bold text-navy dark:text-white leading-tight">Appearance</p>
                <p className="text-[13px] text-gray-500 font-medium capitalize">{theme} Theme</p>
              </div>
            </div>
            <ChevronIcon isOpen={activeSection === 'appearance'} />
          </button>

          {activeSection === 'appearance' && (
            <div className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      theme === value
                        ? 'border-brand bg-brand/5 text-brand'
                        : 'border-transparent bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <button onClick={handleSignOut} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-2 bg-[#FCF8F8] dark:bg-gray-800/30">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-full border border-red-200 dark:border-red-900/30 text-red-500 bg-white dark:bg-gray-900 shadow-sm">
              <LogOut className="h-4 w-4 ml-0.5" />
            </div>
            <div className="text-left">
              <p className="text-[15px] font-bold text-[#E53E3E] leading-tight tracking-wide">Sign Out</p>
            </div>
          </div>
        </button>

      </div>
    </div>
  )
}
