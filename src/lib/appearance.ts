import { useEffect, useState } from 'react'
import { syncStatusBar } from './native'
import { followAppearance } from './settings'

const KEY = 'paper-reader.appearance'
export type AppearancePreference = 'day' | 'night' | 'system'
export type Appearance = 'day' | 'night'

function systemIsNight(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function readAppearancePreference(): AppearancePreference {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'night' || value === 'day' || value === 'system') return value
    return 'system'
  } catch {
    return 'system'
  }
}

export function resolveAppearance(preference: AppearancePreference, systemNight = systemIsNight()): Appearance {
  if (preference === 'system') return systemNight ? 'night' : 'day'
  return preference
}

export function readAppearance(): Appearance {
  return resolveAppearance(readAppearancePreference())
}

export function applyAppearance(mode: Appearance) {
  document.documentElement.classList.toggle('appearance-night', mode === 'night')
  void syncStatusBar(mode === 'night')
}

applyAppearance(readAppearance())
followAppearance(readAppearance(), false)

export function useAppearance() {
  const [preference, setPreference] = useState<AppearancePreference>(readAppearancePreference)
  const [systemNight, setSystemNight] = useState(systemIsNight)
  const mode = resolveAppearance(preference, systemNight)

  useEffect(() => {
    if (preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      setSystemNight(media.matches)
      const resolved: Appearance = media.matches ? 'night' : 'day'
      applyAppearance(resolved)
      followAppearance(resolved, true)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  function setAppearance(next: AppearancePreference) {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* private mode */
    }
    setPreference(next)
    const resolved = resolveAppearance(next, systemNight)
    applyAppearance(resolved)
    followAppearance(resolved, true)
  }

  return { mode, preference, setAppearance }
}
