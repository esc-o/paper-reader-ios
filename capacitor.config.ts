import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.paperreader.ios',
  appName: 'Paper Reader',
  webDir: 'dist',
  backgroundColor: '#f7f4ee',
  ios: {
    contentInset: 'never',
    backgroundColor: '#f7f4ee',
    preferredContentMode: 'mobile',
    scheme: 'capacitor',
  },
  plugins: {
    Keyboard: {
      resize: 'native',
    },
  },
}

export default config
