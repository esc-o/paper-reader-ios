import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { documentKind, importDocument } from './library'
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
    void openImportedFile(detail.name || 'paper.pdf', detail.base64)
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

async function openImportedFile(name: string, base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const fileName = name.trim() || 'paper.pdf'
  const kind = documentKind(fileName)
  const type =
    kind === 'pdf' ? 'application/pdf' : kind === 'txt' ? 'text/plain' : kind === 'mobi' ? 'application/x-mobipocket-ebook' : ''
  const file = new File([bytes], fileName, { type })
  const id = await importDocument(file)
  window.location.hash = routes.reader(id)
}
