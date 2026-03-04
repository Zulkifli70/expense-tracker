import { createSharedComposable } from '@vueuse/core'

type ExpensePayload = {
  accountName: string
  categoryName: string
  amount: number
  note?: string
  occurredAt: string
}

type BalancePayload = {
  accountName: string
  accountType: string
  amount: number
}

type UpdateTransactionPayload = {
  accountName: string
  categoryName: string
  amount: number
  note?: string
  occurredAt: string
}

type QueueItem =
  | {
      id: string
      type: 'create-expense'
      payload: ExpensePayload
      createdAt: string
    }
  | {
      id: string
      type: 'add-balance'
      payload: BalancePayload
      createdAt: string
    }
  | {
      id: string
      type: 'update-transaction'
      transactionId: string
      payload: UpdateTransactionPayload
      createdAt: string
    }
  | {
      id: string
      type: 'delete-transaction'
      transactionId: string
      createdAt: string
    }

type AddExpenseResult = {
  queued: boolean
  id?: string
}

type QueueResult = {
  queued: boolean
}

type FlushResult = {
  synced: number
  discarded: number
  remaining: number
}

type NetworkOperation<T = unknown> = () => Promise<T>

const DB_NAME = 'expense-tracker-offline'
const STORE_NAME = 'expense-queue'

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'))
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

function shouldQueueFromError(error: any) {
  if (!import.meta.client) return false
  if (!navigator.onLine) return true
  return !error?.response
}

function isHttpError(error: any) {
  return !!error?.response
}

const _useOfflineExpenses = () => {
  const pendingCount = useState<number>('offline-expenses-pending-count', () => 0)
  const syncInProgress = useState<boolean>('offline-expenses-sync-in-progress', () => false)

  const refreshPendingCount = async () => {
    if (!import.meta.client) return
    const db = await openQueueDb()
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const items = await requestToPromise(store.getAll())
      pendingCount.value = (items as QueueItem[]).length
    } finally {
      db.close()
    }
  }

  const enqueueItem = async (item: QueueItem) => {
    const db = await openQueueDb()
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      await requestToPromise(store.put(item))
      pendingCount.value += 1
    } finally {
      db.close()
    }
  }

  const queueOrRun = async <T>(
    run: NetworkOperation<T>,
    createItem: () => QueueItem
  ): Promise<{ queued: false; data: T } | { queued: true }> => {
    if (!import.meta.client) {
      const data = await run()
      return { queued: false, data }
    }

    if (!navigator.onLine) {
      await enqueueItem(createItem())
      return { queued: true }
    }

    try {
      const data = await run()
      return { queued: false, data }
    } catch (error: any) {
      if (!shouldQueueFromError(error)) throw error
      await enqueueItem(createItem())
      return { queued: true }
    }
  }

  const addExpenseWithOfflineFallback = async (
    payload: ExpensePayload
  ): Promise<AddExpenseResult> => {
    const id = crypto.randomUUID()
    const result = await queueOrRun(
      () =>
        $fetch<{ ok: boolean; id?: string }>('/api/home/expenses', {
          method: 'POST',
          body: payload
        }),
      () => ({
        id,
        type: 'create-expense',
        payload,
        createdAt: new Date().toISOString()
      })
    )

    if (result.queued) return { queued: true }
    return { queued: false, id: result.data.id }
  }

  const addBalanceWithOfflineFallback = async (
    payload: BalancePayload
  ): Promise<QueueResult> => {
    const id = crypto.randomUUID()
    const result = await queueOrRun(
      () =>
        $fetch('/api/home/balance', {
          method: 'POST',
          body: payload
        }),
      () => ({
        id,
        type: 'add-balance',
        payload,
        createdAt: new Date().toISOString()
      })
    )
    return { queued: result.queued }
  }

  const updateTransactionWithOfflineFallback = async (
    transactionId: string,
    payload: UpdateTransactionPayload
  ): Promise<QueueResult> => {
    const id = crypto.randomUUID()
    const result = await queueOrRun(
      () =>
        $fetch(`/api/transactions/${transactionId}`, {
          method: 'PATCH',
          body: payload
        }),
      () => ({
        id,
        type: 'update-transaction',
        transactionId,
        payload,
        createdAt: new Date().toISOString()
      })
    )
    return { queued: result.queued }
  }

  const deleteTransactionWithOfflineFallback = async (
    transactionId: string
  ): Promise<QueueResult> => {
    const id = crypto.randomUUID()
    const result = await queueOrRun(
      () =>
        $fetch(`/api/transactions/${transactionId}`, {
          method: 'DELETE'
        }),
      () => ({
        id,
        type: 'delete-transaction',
        transactionId,
        createdAt: new Date().toISOString()
      })
    )
    return { queued: result.queued }
  }

  const runQueuedOperation = async (item: QueueItem) => {
    if (item.type === 'create-expense') {
      await $fetch('/api/home/expenses', { method: 'POST', body: item.payload })
      return
    }
    if (item.type === 'add-balance') {
      await $fetch('/api/home/balance', { method: 'POST', body: item.payload })
      return
    }
    if (item.type === 'update-transaction') {
      await $fetch(`/api/transactions/${item.transactionId}`, {
        method: 'PATCH',
        body: item.payload
      })
      return
    }
    await $fetch(`/api/transactions/${item.transactionId}`, { method: 'DELETE' })
  }

  const flushQueuedExpenses = async (): Promise<FlushResult> => {
    if (!import.meta.client) return { synced: 0, discarded: 0, remaining: 0 }
    if (!navigator.onLine) return { synced: 0, discarded: 0, remaining: pendingCount.value }
    if (syncInProgress.value) return { synced: 0, discarded: 0, remaining: pendingCount.value }

    syncInProgress.value = true

    let synced = 0
    let discarded = 0

    try {
      const db = await openQueueDb()

      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const items = (await requestToPromise(store.getAll())) as QueueItem[]
        items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

        for (const item of items) {
          try {
            await runQueuedOperation(item)
            const deleteTx = db.transaction(STORE_NAME, 'readwrite')
            const deleteStore = deleteTx.objectStore(STORE_NAME)
            await requestToPromise(deleteStore.delete(item.id))
            synced += 1
          } catch (error: any) {
            if (shouldQueueFromError(error)) {
              break
            }

            if (isHttpError(error)) {
              const deleteTx = db.transaction(STORE_NAME, 'readwrite')
              const deleteStore = deleteTx.objectStore(STORE_NAME)
              await requestToPromise(deleteStore.delete(item.id))
              discarded += 1
            }
          }
        }
      } finally {
        db.close()
      }

      await refreshPendingCount()
      return { synced, discarded, remaining: pendingCount.value }
    } finally {
      syncInProgress.value = false
    }
  }

  return {
    pendingCount,
    syncInProgress,
    refreshPendingCount,
    addExpenseWithOfflineFallback,
    addBalanceWithOfflineFallback,
    updateTransactionWithOfflineFallback,
    deleteTransactionWithOfflineFallback,
    flushQueuedExpenses
  }
}

export const useOfflineExpenses = createSharedComposable(_useOfflineExpenses)
