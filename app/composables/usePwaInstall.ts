type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const usePwaInstall = () => {
  const deferredPrompt = useState<BeforeInstallPromptEvent | null>('pwa-deferred-prompt', () => null)
  const canInstall = useState<boolean>('pwa-can-install', () => false)
  const isInstalled = useState<boolean>('pwa-is-installed', () => false)
  const installInProgress = useState<boolean>('pwa-install-in-progress', () => false)
  const shouldShowInstallCta = computed(() => import.meta.client && !isInstalled.value)

  const promptInstall = async () => {
    if (!deferredPrompt.value || installInProgress.value) {
      return { installed: false, promptAvailable: false }
    }

    installInProgress.value = true
    try {
      await deferredPrompt.value.prompt()
      const result = await deferredPrompt.value.userChoice
      const installed = result.outcome === 'accepted'
      if (installed) {
        isInstalled.value = true
      }
      canInstall.value = false
      deferredPrompt.value = null
      return { installed, promptAvailable: true }
    } finally {
      installInProgress.value = false
    }
  }

  const installHelpText = computed(() => {
    if (!import.meta.client) return ''
    const ua = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(ua)
    if (isIos) {
      return 'On iPhone/iPad Safari: tap Share, then choose Add to Home Screen.'
    }
    return 'On Chrome/Brave Android: open browser menu (three dots), then tap Install app or Add to Home screen.'
  })

  return {
    canInstall,
    isInstalled,
    shouldShowInstallCta,
    installHelpText,
    installInProgress,
    promptInstall
  }
}
