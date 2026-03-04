type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default defineNuxtPlugin(() => {
  const deferredPrompt = useState<BeforeInstallPromptEvent | null>('pwa-deferred-prompt', () => null)
  const canInstall = useState<boolean>('pwa-can-install', () => false)
  const isInstalled = useState<boolean>('pwa-is-installed', () => false)

  const standaloneByDisplayMode = window.matchMedia('(display-mode: standalone)').matches
  const standaloneByNavigator = (window.navigator as any).standalone === true
  isInstalled.value = standaloneByDisplayMode || standaloneByNavigator

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
    canInstall.value = true
  })

  window.addEventListener('appinstalled', () => {
    isInstalled.value = true
    canInstall.value = false
    deferredPrompt.value = null
  })
})
