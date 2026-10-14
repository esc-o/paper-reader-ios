import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { Session, User } from '@supabase/supabase-js'
import i18n from '../i18n'
import { onLocalChange } from './changes'
import { supabase, supabaseAnonKey } from './supabase'
import { syncNow } from './sync'

const NATIVE_AUTH_REDIRECT = 'paperreader://login-callback'

type AuthValue = {
  configured: boolean
  user: User | null
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function displayName(user: User): string {
  const meta = user.user_metadata as { given_name?: string; full_name?: string; name?: string }
  const given = meta.given_name?.trim()
  const full = given || meta.full_name?.trim() || meta.name?.trim() || ''
  const first = full.split(/\s+/)[0]
  return first || user.email?.split('@')[0] || ''
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    let removeUrlListener: (() => void) | undefined
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appUrlOpen', ({ url }) => {
        if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return
        void finishNativeSignIn(url).then((message) => {
          if (message) setError(message)
        })
      }).then((handle) => {
        removeUrlListener = () => {
          void handle.remove()
        }
      })
    }
    return () => {
      alive = false
      data.subscription.unsubscribe()
      removeUrlListener?.()
    }
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    void syncNow()
    let timer = 0
    const stop = onLocalChange(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void syncNow(), 800)
    })
    return () => {
      window.clearTimeout(timer)
      stop()
    }
  }, [userId])

  const signIn = useCallback(async () => {
    if (!supabase) {
      setError(i18n.t('auth.needsSetup'))
      return
    }
    setError(null)
    const native = Capacitor.isNativePlatform()
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: native ? NATIVE_AUTH_REDIRECT : `${window.location.origin}${window.location.pathname}`,
        skipBrowserRedirect: true,
      },
    })
    if (authError || !data.url) {
      setError(authError?.message || i18n.t('auth.failed'))
      return
    }
    const next = new URL(data.url)
    next.searchParams.set('apikey', supabaseAnonKey)
    if (native) {
      await Browser.open({ url: next.toString(), presentationStyle: 'popover' })
      return
    }
    window.location.assign(next.toString())
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    if (!supabase) return
    const { error: authError } = await supabase.auth.signOut()
    if (authError) setError(authError.message || i18n.t('auth.failed'))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthValue>(
    () => ({
      configured: supabase !== null,
      user: session?.user ?? null,
      error,
      signIn,
      signOut,
      clearError,
    }),
    [session, error, signIn, signOut, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

async function finishNativeSignIn(url: string): Promise<string | null> {
  if (!supabase) return i18n.t('auth.needsSetup')
  try {
    await Browser.close()
  } catch {
    // The in-app browser is already gone once iOS hands the callback back.
  }
  const parsed = new URL(url)
  const code = parsed.searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return error ? error.message || i18n.t('auth.failed') : null
  }
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : ''
  const params = new URLSearchParams(hash || parsed.search.slice(1))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return i18n.t('auth.failed')
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  return error ? error.message || i18n.t('auth.failed') : null
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}
