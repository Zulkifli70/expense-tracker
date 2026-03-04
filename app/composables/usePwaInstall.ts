type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const usePwaInstall = () => {
  const deferredPrompt = useState<BeforeInstallPromptEvent | null>('pwa-deferred-prompt', () => null)
  const canInstall = useState<boolean>('pwa-can-install', () => false)
  const isInstalled = useState<boolean>('pwa-is-installed', () => false)
  const installInProgress = useState<boolean>('pwa-install-in-progress', () => false)

  const promptInstall = async () => {
    if (!deferredPrompt.value || installInProgress.value) return { installed: false }

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
      return { installed }
    } finally {
      installInProgress.value = false
    }
  }

  return {
    canInstall,
    isInstalled,
    installInProgress,
    promptInstall
  }
}
