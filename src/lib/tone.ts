import { useEffect, useState } from 'react'

const KEY = 'paper-reader.tone'

export type Rgb = { r: number; g: number; b: number }

function clamp(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function luminance(rgb: Rgb): number {
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
}

/** Accepts `43, 34, 32`, `rgb(43, 34, 32)`, `#2b2220`, and `#abc`. */
export function parseRgb(input: string): Rgb | null {
  const text = input.trim()
  if (!text) return null
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const raw = hex[1]
    const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    }
  }
  const body = text.replace(/^rgba?\(/i, '').replace(/\)$/, '')
  const parts = body.split(/[\s,]+/).filter(Boolean)
  if (parts.length < 3) return null
  const channels = parts.slice(0, 3).map((part) => Number(part))
  if (channels.some((channel) => !Number.isFinite(channel))) return null
  return { r: clamp(channels[0]), g: clamp(channels[1]), b: clamp(channels[2]) }
}

export function formatRgb(rgb: Rgb): string {
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`
}

function css(rgb: Rgb): string {
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`
}

function mixTowardBlack(rgb: Rgb, amount: number): string {
  const keep = 1 - amount
  return `rgb(${Math.round(rgb.r * keep)} ${Math.round(rgb.g * keep)} ${Math.round(rgb.b * keep)})`
}

export function readTone(): Rgb | null {
  try {
    return parseRgb(localStorage.getItem(KEY) ?? '')
  } catch {
    return null
  }
}

export function applyTone(rgb: Rgb | null) {
  const root = document.documentElement
  if (!rgb) {
    root.style.removeProperty('--chocolate')
    root.style.removeProperty('--ink')
    root.style.removeProperty('--accent')
    return
  }
  const y = luminance(rgb)
  root.style.setProperty('--chocolate', y > 0.62 ? mixTowardBlack(rgb, 0.5) : css(rgb))
  root.style.setProperty('--ink', y > 0.45 ? mixTowardBlack(rgb, 0.72) : css(rgb))
  root.style.setProperty('--accent', css(rgb))
}

applyTone(readTone())

export function useTone() {
  const [tone, setTone] = useState<Rgb | null>(readTone)

  useEffect(() => {
    applyTone(tone)
  }, [tone])

  function saveTone(next: Rgb | null) {
    try {
      if (next) localStorage.setItem(KEY, formatRgb(next))
      else localStorage.removeItem(KEY)
    } catch {
      /* private mode */
    }
    setTone(next)
  }

  return { tone, saveTone }
}
