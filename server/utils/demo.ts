import type { AuthUser } from './auth'

type DemoUser = AuthUser & {
  isDemo: true
}

type DemoAccount = {
  id: string
  name: string
  type: string
  balance: number
  isArchived?: boolean
}

type DemoCategory = {
  id: string
  name: string
  kind: 'expense' | 'income'
  color?: string
}

type DemoTransaction = {
  id: string
  userId: string
  accountId?: string
  categoryId?: string
  kind: 'expense' | 'income'
  amount: number
  note?: string
  occurredAt: Date
  createdAt: Date
  updatedAt: Date
}

type DemoBudget = {
  scope: 'overall'
  period: 'monthly'
  startDate: Date
  endDate: Date
  limitAmount: number
  alertThresholds: number[]
  createdAt: Date
  updatedAt: Date
}

type DemoState = {
  user: DemoUser
  accounts: DemoAccount[]
  categories: DemoCategory[]
  transactions: DemoTransaction[]
  budget: DemoBudget
  createdAt: Date
  updatedAt: Date
}

type DemoAuthLikeUser = {
  id?: string
  email?: string
  username?: string
  name?: string
  isDemo?: boolean
}

type DemoTransactionPayload = {
  accountName?: string
  categoryName: string
  amount: number
  note?: string
  occurredAt?: string
}

type DemoDateSearch = {
  mode: 'full_date'
  range: { start: Date, end: Date }
} | {
  mode: 'day_month'
  day: number
  month: number
} | {
  mode: 'day_only'
  day: number
}

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000
const FALLBACK_COLORS = ['#0EA5E9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6']
const DEMO_STORAGE_NAMESPACE = 'demo-sessions'

const MONTH_ALIAS_MAP: Record<string, number> = {
  jan: 1,
  januari: 1,
  january: 1,
  feb: 2,
  februari: 2,
  february: 2,
  mar: 3,
  maret: 3,
  march: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  june: 6,
  jul: 7,
  juli: 7,
  july: 7,
  agu: 8,
  ags: 8,
  agust: 8,
  agustus: 8,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oktober: 10,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  des: 12,
  desember: 12,
  dec: 12,
  december: 12
}

type StoredDemoState = Omit<DemoState, 'createdAt' | 'updatedAt' | 'transactions' | 'budget'> & {
  createdAt: string
  updatedAt: string
  transactions: Array<Omit<DemoTransaction, 'occurredAt' | 'createdAt' | 'updatedAt'> & {
    occurredAt: string
    createdAt: string
    updatedAt: string
  }>
  budget: Omit<DemoBudget, 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'> & {
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string
  }
}

function getDemoStorage() {
  return useStorage(DEMO_STORAGE_NAMESPACE)
}

function demoStorageKey(sessionId: string) {
  return `session:${sessionId}`
}

function serializeDemoState(state: DemoState): StoredDemoState {
  return {
    ...state,
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
    transactions: state.transactions.map(item => ({
      ...item,
      occurredAt: item.occurredAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    })),
    budget: {
      ...state.budget,
      startDate: state.budget.startDate.toISOString(),
      endDate: state.budget.endDate.toISOString(),
      createdAt: state.budget.createdAt.toISOString(),
      updatedAt: state.budget.updatedAt.toISOString()
    }
  }
}

function deserializeDemoState(input: StoredDemoState | DemoState) {
  if (input.createdAt instanceof Date) {
    return input as DemoState
  }

  return {
    ...input,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
    transactions: input.transactions.map(item => ({
      ...item,
      occurredAt: new Date(item.occurredAt),
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    })),
    budget: {
      ...input.budget,
      startDate: new Date(input.budget.startDate),
      endDate: new Date(input.budget.endDate),
      createdAt: new Date(input.budget.createdAt),
      updatedAt: new Date(input.budget.updatedAt)
    }
  } satisfies DemoState
}

async function persistDemoState(sessionId: string, state: DemoState) {
  await getDemoStorage().setItem(demoStorageKey(sessionId), serializeDemoState(state))
}

function generateId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatSessionSuffix(sessionId: string) {
  let hash = 0
  for (const char of sessionId) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  }

  return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8)
}

function shiftDays(baseDate: Date, days: number, hours = 9, minutes = 0) {
  const local = new Date(baseDate.getTime() + JAKARTA_OFFSET_MS)
  return new Date(Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + days,
    hours,
    minutes,
    0,
    0
  ) - JAKARTA_OFFSET_MS)
}

function monthRange(baseDate: Date) {
  const local = new Date(baseDate.getTime() + JAKARTA_OFFSET_MS)
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - JAKARTA_OFFSET_MS)
  const end = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - JAKARTA_OFFSET_MS - 1)
  return { start, end }
}

function getDayRange(date: Date) {
  const local = new Date(date.getTime() + JAKARTA_OFFSET_MS)
  const start = new Date(Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    0,
    0,
    0,
    0
  ) - JAKARTA_OFFSET_MS)
  const end = new Date(Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    23,
    59,
    59,
    999
  ) - JAKARTA_OFFSET_MS)
  return { start, end }
}

function getThisWeekRange(baseDate: Date) {
  const local = new Date(baseDate.getTime() + JAKARTA_OFFSET_MS)
  const currentWeekDay = local.getUTCDay()
  const mondayOffset = currentWeekDay === 0 ? -6 : 1 - currentWeekDay

  local.setUTCDate(local.getUTCDate() + mondayOffset)

  const start = new Date(Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    0,
    0,
    0,
    0
  ) - JAKARTA_OFFSET_MS)
  const end = new Date(Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 7,
    0,
    0,
    0,
    0
  ) - JAKARTA_OFFSET_MS - 1)

  return { start, end }
}

function getLastDaysRange(baseDate: Date, days: number) {
  const { start } = getDayRange(shiftDays(baseDate, -(days - 1)))
  const { end } = getDayRange(baseDate)
  return { start, end }
}

function parseDate(input: unknown, fallback: Date) {
  if (typeof input !== 'string' || !input) return fallback
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function toVariation(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

function toAmountByKind(kind: 'expense' | 'income', amount: number) {
  return kind === 'income' ? amount : -amount
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildUtcDateRange(year: number, month: number, day: number) {
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  if (
    start.getUTCFullYear() !== year
    || start.getUTCMonth() !== month - 1
    || start.getUTCDate() !== day
  ) {
    return null
  }
  return { start, end }
}

function parseDateSearch(search: string): DemoDateSearch | null {
  const raw = search.trim().toLowerCase()
  if (!raw) return null

  const dayOnlyMatch = raw.match(/^(\d{1,2})$/)
  if (dayOnlyMatch) {
    const day = Number(dayOnlyMatch[1])
    if (day >= 1 && day <= 31) {
      return { mode: 'day_only', day }
    }
    return null
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const range = buildUtcDateRange(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
    return range ? { mode: 'full_date', range } : null
  }

  const numericMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/)
  if (numericMatch) {
    const day = Number(numericMatch[1])
    const month = Number(numericMatch[2])
    const year = numericMatch[3]
      ? (numericMatch[3].length === 2 ? 2000 + Number(numericMatch[3]) : Number(numericMatch[3]))
      : null

    if (year) {
      const range = buildUtcDateRange(year, month, day)
      return range ? { mode: 'full_date', range } : null
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { mode: 'day_month', day, month }
    }
    return null
  }

  const textMatch = raw.match(/^(\d{1,2})\s+([a-zA-Z.]+)(?:\s+(\d{4}))?$/)
  if (!textMatch) return null

  const day = Number(textMatch[1])
  const monthToken = textMatch[2]?.replace(/\./g, '') || ''
  const month = MONTH_ALIAS_MAP[monthToken]
  if (!month || day < 1 || day > 31) return null

  if (textMatch[3]) {
    const range = buildUtcDateRange(Number(textMatch[3]), month, day)
    return range ? { mode: 'full_date', range } : null
  }

  return { mode: 'day_month', day, month }
}

function isWithinRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end
}

function sumTransactionsByRange(
  transactions: DemoTransaction[],
  start: Date,
  end: Date,
  kind: 'expense' | 'income'
) {
  return transactions
    .filter(item => item.kind === kind && isWithinRange(item.occurredAt, start, end))
    .reduce((sum, item) => sum + item.amount, 0)
}

function toBucketKey(date: Date, unit: 'day' | 'week' | 'month') {
  const local = new Date(date.getTime() + JAKARTA_OFFSET_MS)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth()
  const day = local.getUTCDate()

  if (unit === 'month') {
    return new Date(Date.UTC(year, month, 1) - JAKARTA_OFFSET_MS).toISOString()
  }

  if (unit === 'week') {
    const dayOfWeek = local.getUTCDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    return new Date(Date.UTC(year, month, day + mondayOffset) - JAKARTA_OFFSET_MS).toISOString()
  }

  return new Date(Date.UTC(year, month, day) - JAKARTA_OFFSET_MS).toISOString()
}

function matchesDateSearch(date: Date, parsed: DemoDateSearch | null) {
  if (!parsed) return false
  if (parsed.mode === 'full_date') {
    return isWithinRange(date, parsed.range.start, parsed.range.end)
  }

  const local = new Date(date.getTime() + JAKARTA_OFFSET_MS)
  const day = local.getUTCDate()
  if (parsed.mode === 'day_only') {
    return day === parsed.day
  }

  return day === parsed.day && local.getUTCMonth() + 1 === parsed.month
}

function findAccount(state: DemoState, accountId?: string) {
  return state.accounts.find(item => item.id === accountId)
}

function findCategory(state: DemoState, categoryId?: string) {
  return state.categories.find(item => item.id === categoryId)
}

function ensureAccount(state: DemoState, accountName: string, accountType = 'cash') {
  const existing = state.accounts.find(item => item.name.toLowerCase() === accountName.toLowerCase())
  if (existing) {
    existing.isArchived = false
    return existing
  }

  const account: DemoAccount = {
    id: `demo-account-${generateId()}`,
    name: accountName,
    type: accountType,
    balance: 0,
    isArchived: false
  }
  state.accounts.push(account)
  return account
}

function ensureCategory(
  state: DemoState,
  categoryName: string,
  kind: 'expense' | 'income' = 'expense'
) {
  const existing = state.categories.find(
    item => item.kind === kind && item.name.toLowerCase() === categoryName.toLowerCase()
  )
  if (existing) {
    return existing
  }

  const category: DemoCategory = {
    id: `demo-category-${generateId()}`,
    name: categoryName,
    kind,
    color: FALLBACK_COLORS[state.categories.length % FALLBACK_COLORS.length]
  }
  state.categories.push(category)
  return category
}

function createDemoSeed(sessionId: string): DemoState {
  const now = new Date()
  const suffix = formatSessionSuffix(sessionId)
  const month = monthRange(now)

  const user: DemoUser = {
    id: `demo-session:${sessionId}`,
    email: `demo+${suffix}@expense.local`,
    username: `demo-${suffix}`,
    name: 'Demo User',
    isDemo: true
  }

  const accounts: DemoAccount[] = [
    {
      id: 'demo-account-wallet',
      name: 'Cash Wallet',
      type: 'cash',
      balance: 2350000
    },
    {
      id: 'demo-account-bank',
      name: 'BCA Main',
      type: 'bank',
      balance: 8750000
    },
    {
      id: 'demo-account-ewallet',
      name: 'GoPay',
      type: 'ewallet',
      balance: 420000
    }
  ]

  const categories: DemoCategory[] = [
    { id: 'demo-category-food', name: 'Food', kind: 'expense', color: '#F97316' },
    { id: 'demo-category-transport', name: 'Transport', kind: 'expense', color: '#0EA5E9' },
    { id: 'demo-category-bills', name: 'Bills', kind: 'expense', color: '#8B5CF6' },
    { id: 'demo-category-shopping', name: 'Shopping', kind: 'expense', color: '#EC4899' },
    { id: 'demo-category-health', name: 'Health', kind: 'expense', color: '#14B8A6' },
    { id: 'demo-category-entertainment', name: 'Entertainment', kind: 'expense', color: '#F59E0B' }
  ]

  const transactions: DemoTransaction[] = [
    {
      id: 'demo-txn-1',
      userId: user.id,
      accountId: 'demo-account-ewallet',
      categoryId: 'demo-category-food',
      kind: 'expense',
      amount: 85000,
      note: 'Lunch with client',
      occurredAt: shiftDays(now, 0, 12, 15),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-txn-2',
      userId: user.id,
      accountId: 'demo-account-bank',
      categoryId: 'demo-category-bills',
      kind: 'expense',
      amount: 650000,
      note: 'Electricity and internet',
      occurredAt: shiftDays(now, -1, 8, 40),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-txn-3',
      userId: user.id,
      accountId: 'demo-account-ewallet',
      categoryId: 'demo-category-transport',
      kind: 'expense',
      amount: 42000,
      note: 'Ride to office',
      occurredAt: shiftDays(now, -2, 7, 30),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-txn-4',
      userId: user.id,
      accountId: 'demo-account-bank',
      categoryId: 'demo-category-shopping',
      kind: 'expense',
      amount: 315000,
      note: 'Household supplies',
      occurredAt: shiftDays(now, -4, 18, 20),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-txn-5',
      userId: user.id,
      accountId: 'demo-account-wallet',
      categoryId: 'demo-category-food',
      kind: 'expense',
      amount: 120000,
      note: 'Weekend dinner',
      occurredAt: shiftDays(now, -6, 19, 10),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-txn-6',
      userId: user.id,
      accountId: 'demo-account-bank',
      categoryId: 'demo-category-health',
      kind: 'expense',
      amount: 180000,
      note: 'Pharmacy',
      occurredAt: shiftDays(now, -9, 10, 45),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-txn-7',
      userId: user.id,
      accountId: 'demo-account-ewallet',
      categoryId: 'demo-category-entertainment',
      kind: 'expense',
      amount: 99000,
      note: 'Movie night',
      occurredAt: shiftDays(now, -12, 20, 0),
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'demo-txn-8',
      userId: user.id,
      accountId: 'demo-account-bank',
      categoryId: 'demo-category-bills',
      kind: 'expense',
      amount: 1250000,
      note: 'Monthly rent',
      occurredAt: new Date(month.start.getTime() + 2 * 24 * 60 * 60 * 1000 + (2 * 60 + 30) * 60 * 1000),
      createdAt: now,
      updatedAt: now
    }
  ]

  const budget: DemoBudget = {
    scope: 'overall',
    period: 'monthly',
    startDate: month.start,
    endDate: month.end,
    limitAmount: 4200000,
    alertThresholds: [70, 90],
    createdAt: now,
    updatedAt: now
  }

  return {
    user,
    accounts,
    categories,
    transactions,
    budget,
    createdAt: now,
    updatedAt: now
  }
}

function touchState(state: DemoState) {
  state.updatedAt = new Date()
}

export async function createDemoSession() {
  const sessionId = generateId()
  const state = createDemoSeed(sessionId)
  await persistDemoState(sessionId, state)
  return {
    sessionId,
    user: state.user
  }
}

export async function clearDemoSession(sessionId?: string) {
  if (!sessionId) return
  await getDemoStorage().removeItem(demoStorageKey(sessionId))
}

export function isDemoUser(user: DemoAuthLikeUser | null | undefined) {
  return !!user?.isDemo || !!user?.id?.startsWith('demo-session:')
}

export function getDemoSessionId(user: DemoAuthLikeUser | null | undefined) {
  if (!user?.id?.startsWith('demo-session:')) return undefined
  return user.id.slice('demo-session:'.length)
}

export async function getDemoStateBySessionId(sessionId: string) {
  const existing = await getDemoStorage().getItem<StoredDemoState | DemoState>(demoStorageKey(sessionId))
  if (existing) {
    return deserializeDemoState(existing)
  }

  const seeded = createDemoSeed(sessionId)
  await persistDemoState(sessionId, seeded)
  return seeded
}

export async function getDemoStateForUser(user: DemoAuthLikeUser | null | undefined) {
  const sessionId = getDemoSessionId(user)
  if (!sessionId) return null
  return await getDemoStateBySessionId(sessionId)
}

export function buildDemoHomeResponse(
  state: DemoState,
  query: Record<string, unknown>,
  userId: string
) {
  const endDefault = new Date()
  const startDefault = new Date(endDefault.getTime() - 14 * 24 * 60 * 60 * 1000)
  const period = query.period === 'weekly' || query.period === 'monthly' ? query.period : 'daily'
  const start = parseDate(query.start, startDefault)
  const end = parseDate(query.end, endDefault)

  if (start > end) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid date range'
    })
  }

  const activeAccounts = state.accounts.filter(item => item.isArchived !== true)
  const totalBalance = activeAccounts.reduce((sum, item) => sum + item.balance, 0)
  const filteredTransactions = state.transactions.filter(
    item => item.kind === 'expense' && isWithinRange(item.occurredAt, start, end)
  )

  const currentSpending = filteredTransactions.reduce((sum, item) => sum + item.amount, 0)
  const durationMs = Math.max(end.getTime() - start.getTime(), 1)
  const previousStart = new Date(start.getTime() - durationMs)
  const previousEnd = new Date(end.getTime() - durationMs)
  const previousSpending = sumTransactionsByRange(state.transactions, previousStart, previousEnd, 'expense')
  const spendingVariation = toVariation(currentSpending, previousSpending)

  const todayRange = getDayRange(end)
  const yesterdayRange = getDayRange(new Date(end.getTime() - 24 * 60 * 60 * 1000))
  const todayLargest = state.transactions
    .filter(item => item.kind === 'expense' && isWithinRange(item.occurredAt, todayRange.start, todayRange.end))
    .sort((a, b) => b.amount - a.amount)[0]
  const yesterdayLargest = state.transactions
    .filter(item => item.kind === 'expense' && isWithinRange(item.occurredAt, yesterdayRange.start, yesterdayRange.end))
    .sort((a, b) => b.amount - a.amount)[0]

  const largestExpenseToday = todayLargest?.amount ?? 0
  const largestExpenseVariation = toVariation(largestExpenseToday, yesterdayLargest?.amount ?? 0)

  const unitByPeriod: Record<'daily' | 'weekly' | 'monthly', 'day' | 'week' | 'month'> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month'
  }
  const chartMap = new Map<string, number>()
  filteredTransactions.forEach((item) => {
    const bucket = toBucketKey(item.occurredAt, unitByPeriod[period])
    chartMap.set(bucket, (chartMap.get(bucket) || 0) + item.amount)
  })

  const categoryTotals = new Map<string, number>()
  filteredTransactions.forEach((item) => {
    const category = findCategory(state, item.categoryId)?.name || 'Other'
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + item.amount)
  })

  const categories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount], index) => ({
      label,
      amount,
      color: state.categories.find(item => item.name === label)?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
    }))

  const month = monthRange(end)
  if (state.budget.startDate.getTime() !== month.start.getTime() || state.budget.endDate.getTime() !== month.end.getTime()) {
    state.budget.startDate = month.start
    state.budget.endDate = month.end
  }

  const monthlySpent = sumTransactionsByRange(state.transactions, month.start, month.end, 'expense')
  const thresholds = (state.budget.alertThresholds || [70, 90]).slice().sort((a, b) => a - b)
  const warningThreshold = thresholds[0] ?? 70
  const criticalThreshold = thresholds[1] ?? 90
  const budgetProgress = state.budget.limitAmount > 0
    ? Math.min(Math.round((monthlySpent / state.budget.limitAmount) * 100), 100)
    : 0
  const budgetStatus = budgetProgress >= criticalThreshold
    ? 'critical'
    : budgetProgress >= warningThreshold
      ? 'warning'
      : 'healthy'

  const latestTransactions = filteredTransactions
    .slice()
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 5)
    .map((item, index) => ({
      id: item.id || `txn-${index + 1}`,
      date: item.occurredAt.toISOString(),
      expenseType: findCategory(state, item.categoryId)?.name || 'Other',
      amount: item.amount,
      description: item.note || '-'
    }))

  return {
    userId,
    range: { start, end },
    period,
    summary: {
      totalBalance,
      currentSpending,
      largestExpenseToday
    },
    stats: [
      {
        title: 'Current Spending',
        icon: 'i-lucide-shopping-cart',
        value: currentSpending,
        variation: spendingVariation
      },
      {
        title: 'Largest Expense (Today)',
        icon: 'i-lucide-circle-dollar-sign',
        value: largestExpenseToday,
        variation: largestExpenseVariation
      }
    ],
    balance: {
      total: totalBalance,
      accounts: activeAccounts.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        balance: item.balance
      }))
    },
    budget: {
      limit: state.budget.limitAmount,
      spent: monthlySpent,
      remaining: Math.max(state.budget.limitAmount - monthlySpent, 0),
      progress: budgetProgress,
      status: budgetStatus,
      thresholds: {
        warning: warningThreshold,
        critical: criticalThreshold
      }
    },
    chart: [...chartMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount })),
    categories,
    latestTransactions
  }
}

export function buildDemoTransactionsResponse(
  state: DemoState,
  query: Record<string, unknown>,
  allCategories: string[]
) {
  const pageInput = Number(query.page || 1)
  const pageSizeInput = Number(query.pageSize || 10)
  const page = Number.isFinite(pageInput) && pageInput >= 1 ? Math.trunc(pageInput) : 1
  const pageSize = [10, 20, 30].includes(pageSizeInput) ? pageSizeInput : 10
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const category = typeof query.category === 'string' ? query.category.trim().toLowerCase() : 'all'
  const period = typeof query.period === 'string' ? query.period : 'this_month'

  const now = new Date()
  let filtered = state.transactions.slice()

  if (period !== 'all_time') {
    const rangeByPeriod: Record<string, { start: Date, end: Date }> = {
      today: getDayRange(now),
      yesterday: getDayRange(shiftDays(now, -1)),
      this_week: getThisWeekRange(now),
      last_30_days: getLastDaysRange(now, 30),
      this_month: monthRange(now)
    }
    const selectedRange = rangeByPeriod[period]
    if (selectedRange) {
      filtered = filtered.filter(item => isWithinRange(item.occurredAt, selectedRange.start, selectedRange.end))
    }
  }

  if (category && category !== 'all') {
    filtered = filtered.filter((item) => {
      const itemCategory = findCategory(state, item.categoryId)?.name || 'Other'
      return itemCategory.toLowerCase() === category
    })
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i')
    const parsedDate = parseDateSearch(search)
    filtered = filtered.filter((item) => {
      const categoryName = findCategory(state, item.categoryId)?.name || 'Other'
      return searchRegex.test(item.note || '')
        || searchRegex.test(categoryName)
        || matchesDateSearch(item.occurredAt, parsedDate)
    })
  }

  filtered.sort((a, b) => {
    const timeDiff = b.occurredAt.getTime() - a.occurredAt.getTime()
    if (timeDiff !== 0) return timeDiff
    return b.id.localeCompare(a.id)
  })

  const total = filtered.length
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const safePage = Math.min(page, totalPages)
  const skip = (safePage - 1) * pageSize
  const items = filtered.slice(skip, skip + pageSize).map(item => ({
    id: item.id,
    date: item.occurredAt.toISOString(),
    accountName: findAccount(state, item.accountId)?.name || 'Cash Wallet',
    category: findCategory(state, item.categoryId)?.name || 'Other',
    description: item.note || '-',
    note: item.note || '-',
    kind: item.kind,
    amount: toAmountByKind(item.kind, item.amount)
  }))

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    categories: ['all', ...allCategories],
    items
  }
}

export function buildDemoTransactionDetail(state: DemoState, id: string) {
  const txn = state.transactions.find(item => item.id === id)
  if (!txn) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Transaction not found'
    })
  }

  return {
    id: txn.id,
    date: txn.occurredAt.toISOString(),
    accountName: findAccount(state, txn.accountId)?.name || 'Cash Wallet',
    category: findCategory(state, txn.categoryId)?.name || 'Other',
    description: txn.note || '-',
    note: txn.note || '',
    kind: txn.kind,
    amount: toAmountByKind(txn.kind, txn.amount)
  }
}

export async function addDemoBalance(
  sessionId: string,
  state: DemoState,
  payload: { accountName: string, accountType: string, amount: number }
) {
  const account = ensureAccount(state, payload.accountName, payload.accountType)
  account.balance += payload.amount
  touchState(state)
  await persistDemoState(sessionId, state)
  return { ok: true }
}

export async function addDemoExpense(
  sessionId: string,
  state: DemoState,
  userId: string,
  payload: DemoTransactionPayload
) {
  const now = new Date()
  const account = ensureAccount(state, payload.accountName || 'Cash Wallet')
  const category = ensureCategory(state, payload.categoryName, 'expense')
  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : now

  const transaction: DemoTransaction = {
    id: `demo-txn-${generateId()}`,
    userId,
    accountId: account.id,
    categoryId: category.id,
    kind: 'expense',
    amount: payload.amount,
    note: payload.note || '',
    occurredAt,
    createdAt: now,
    updatedAt: now
  }

  state.transactions.push(transaction)
  account.balance -= payload.amount
  touchState(state)
  await persistDemoState(sessionId, state)

  return {
    ok: true,
    id: transaction.id
  }
}

export async function updateDemoBudgetLimit(
  sessionId: string,
  state: DemoState,
  payload: { limitAmount: number, warningThreshold?: number, criticalThreshold?: number }
) {
  let warning = payload.warningThreshold ?? 70
  let critical = payload.criticalThreshold ?? 90
  if (warning >= critical) {
    warning = 70
    critical = 90
  }

  const now = new Date()
  const currentMonth = monthRange(now)
  state.budget.startDate = currentMonth.start
  state.budget.endDate = currentMonth.end
  state.budget.limitAmount = payload.limitAmount
  state.budget.alertThresholds = [warning, critical]
  state.budget.updatedAt = now
  touchState(state)
  await persistDemoState(sessionId, state)

  return { ok: true }
}

export async function updateDemoProfile(
  sessionId: string,
  state: DemoState,
  payload: { name: string, email: string, username: string }
) {
  state.user = {
    ...state.user,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    username: payload.username.trim(),
    isDemo: true
  }
  touchState(state)
  await persistDemoState(sessionId, state)

  return {
    user: state.user
  }
}

export async function updateDemoTransaction(
  sessionId: string,
  state: DemoState,
  id: string,
  payload: { accountName?: string, categoryName: string, amount: number, note?: string, occurredAt: string }
) {
  const txn = state.transactions.find(item => item.id === id)
  if (!txn) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Transaction not found'
    })
  }

  const now = new Date()
  const previousAccount = findAccount(state, txn.accountId)
  const nextAccount = ensureAccount(state, payload.accountName || 'Cash Wallet')
  const nextCategory = ensureCategory(state, payload.categoryName, txn.kind)

  if (previousAccount && previousAccount.id === nextAccount.id) {
    previousAccount.balance += txn.amount - payload.amount
  } else {
    if (previousAccount) {
      previousAccount.balance += txn.amount
    }
    nextAccount.balance -= payload.amount
  }

  txn.accountId = nextAccount.id
  txn.categoryId = nextCategory.id
  txn.amount = payload.amount
  txn.note = payload.note || ''
  txn.occurredAt = new Date(payload.occurredAt)
  txn.updatedAt = now
  touchState(state)
  await persistDemoState(sessionId, state)

  return {
    ok: true,
    id,
    amount: -payload.amount
  }
}

export async function deleteDemoTransaction(sessionId: string, state: DemoState, id: string) {
  const index = state.transactions.findIndex(item => item.id === id)
  if (index === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Transaction not found'
    })
  }

  const [txn] = state.transactions.splice(index, 1)
  const account = findAccount(state, txn?.accountId)
  if (account && txn) {
    account.balance += txn.amount
  }
  touchState(state)
  await persistDemoState(sessionId, state)

  return { ok: true }
}
