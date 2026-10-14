import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './lib/appearance'
import './lib/tone'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth'
import { FontsProvider } from './lib/fonts'
import { startNativeShell } from './lib/native'

startNativeShell()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FontsProvider>
        <App />
      </FontsProvider>
    </AuthProvider>
  </StrictMode>,
)
