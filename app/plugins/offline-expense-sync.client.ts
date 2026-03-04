export default defineNuxtPlugin(() => {
  const { flushQueuedExpenses, refreshPendingCount } = useOfflineExpenses()

  const syncWhenOnline = async () => {
    const result = await flushQueuedExpenses()
    if (result.synced > 0) {
      await Promise.all([
        refreshNuxtData('home-data'),
        refreshNuxtData('transactions-data')
      ])
    }
  }

  void refreshPendingCount()

  window.addEventListener('online', () => {
    void syncWhenOnline()
  })

  if (navigator.onLine) {
    void syncWhenOnline()
  }
})
