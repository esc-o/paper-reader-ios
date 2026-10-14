import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { importPdf } from './library'
import { routes } from './router'

type ImportDetail = { name?: string; base64?: string }

let lastImportKey = ''

export function startNativeShell() {
  if (Capacitor.getPlatform() !== 'ios') return
  document.documentElement.classList.add('native-ios')
  window.__paperReaderNativeReady = true
  window.addEventListener('paper-reader-import', (event) => {
    const detail = (event as CustomEvent<ImportDetail>).detail
    if (!detail?.base64) return
    const key = `${detail.name ?? ''}:${detail.base64.length}:${detail.base64.slice(0, 48)}`
    if (key === lastImportKey) return
    lastImportKey = key
    void openImportedPdf(detail.name || 'paper.pdf', detail.base64)
  })
}

export async function syncStatusBar(night: boolean) {
  if (Capacitor.getPlatform() !== 'ios') return
  try {
    await StatusBar.setStyle({ style: night ? Style.Light : Style.Dark })
  } catch {
    // The bridge is not up yet on the first paint.
  }
}

declare global {
  interface Window {
    __paperReaderNativeReady?: boolean
  }
}

async function openImportedPdf(name: string, base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const fileName = name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`
  const file = new File([bytes], fileName, { type: 'application/pdf' })
  const id = await importPdf(file)
  window.location.hash = routes.reader(id)
}
