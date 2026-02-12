import type { Collection, ObjectId } from 'mongodb'
import * as z from 'zod'
import type { Period } from '~/types'
import { getMongoDb } from '../utils/mongodb'

type AccountDocument = {
  _id?: ObjectId
  userId: string
  name: string
  type: string
  balance: number
  isArchived?: boolean
}

type CategoryDocument = {
  _id?: ObjectId
  userId: string
  name: string
  kind: 'expense' | 'income'
  color?: string
}

type TransactionDocument = {
  _id?: ObjectId
  userId: string
  accountId?: ObjectId | string
  categoryId?: ObjectId | string
  kind: 'expense' | 'income'
  amount: number
  note?: string
  occurredAt: Date
}

type BudgetDocument = {
  _id?: ObjectId
  userId: string
  scope: 'overall' | 'category'
  categoryId?: ObjectId | string
  period: 'monthly'
  startDate: Date
  endDate: Date
  limitAmount: number
  alertThresholds?: number[]
}

const periodSchema = z.enum(['daily', 'weekly', 'monthly'])
const JAKARTA_TIMEZONE = 'Asia/Jakarta'
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

function toObjectIdString(id: ObjectId | string | undefined) {
  if (!id) return ''
  return typeof id === 'string' ? id : id.toHexString()
}

function parseDate(input: unknown, fallback: Date) {
  if (typeof input !== 'string' || !input) return fallback
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? fallback : date
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

function getMonthRange(date: Date) {
  const local = new Date(date.getTime() + JAKARTA_OFFSET_MS)
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - JAKARTA_OFFSET_MS)
  const end = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - JAKARTA_OFFSET_MS - 1)
  return { start, end }
}

function toVariation(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

async function sumTransactionsByRange(
  transactions: Collection<TransactionDocument>,
  userId: string,
  start: Date,
  end: Date,
  kind: 'expense' | 'income'
) {
  const [row] = await transactions.aggregate<{ total: number }>([
    {
      $match: {
        userId,
        kind,
        occurredAt: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]).toArray()

  return row?.total ?? 0
}

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig()

  const endDefault = new Date()
  const startDefault = new Date(endDefault.getTime() - 14 * 24 * 60 * 60 * 1000)
  const period = periodSchema.safeParse(query.period).success
    ? periodSchema.parse(query.period)
    : 'daily'

  const start = parseDate(query.start, startDefault)
  const end = parseDate(query.end, endDefault)
  if (start > end) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid date range'
    })
  }

  const userId = typeof query.userId === 'string' && query.userId
    ? query.userId
    : config.mongodbDefaultUserId

  const db = await getMongoDb()
  const accounts = db.collection<AccountDocument>(config.mongodbAccountsCollection)
  const categories = db.collection<CategoryDocument>(config.mongodbCategoriesCollection)
  const transactions = db.collection<TransactionDocument>(config.mongodbTransactionsCollection)
  const budgets = db.collection<BudgetDocument>(config.mongodbBudgetsCollection)

  const [totalBalanceRow] = await accounts.aggregate<{ total: number }>([
    {
      $match: {
        userId,
        isArchived: { $ne: true }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$balance' }
      }
    }
  ]).toArray()
  const totalBalance = totalBalanceRow?.total ?? 0

  const accountsBreakdown = await accounts.find({
    userId,
    isArchived: { $ne: true }
  }).project({
    _id: 1,
    name: 1,
    type: 1,
    balance: 1
  }).toArray()

  const currentSpending = await sumTransactionsByRange(transactions, userId, start, end, 'expense')
  const durationMs = Math.max(end.getTime() - start.getTime(), 1)
  const previousStart = new Date(start.getTime() - durationMs)
  const previousEnd = new Date(end.getTime() - durationMs)
  const previousSpending = await sumTransactionsByRange(transactions, userId, previousStart, previousEnd, 'expense')
  const spendingVariation = toVariation(currentSpending, previousSpending)

  const todayRange = getDayRange(end)
  const yesterdayRange = getDayRange(new Date(end.getTime() - 24 * 60 * 60 * 1000))

  const todayLargest = await transactions.find({
    userId,
    kind: 'expense',
    occurredAt: {
      $gte: todayRange.start,
      $lte: todayRange.end
    }
  }).sort({ amount: -1 }).limit(1).next()
  const yesterdayLargest = await transactions.find({
    userId,
    kind: 'expense',
    occurredAt: {
      $gte: yesterdayRange.start,
      $lte: yesterdayRange.end
    }
  }).sort({ amount: -1 }).limit(1).next()

  const largestExpenseToday = todayLargest?.amount ?? 0
  const largestExpenseVariation = toVariation(largestExpenseToday, yesterdayLargest?.amount ?? 0)

  const unitByPeriod: Record<Period, 'day' | 'week' | 'month'> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month'
  }

  const chart = await transactions.aggregate<{ _id: Date, amount: number }>([
    {
      $match: {
        userId,
        kind: 'expense',
        occurredAt: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: '$occurredAt',
            unit: unitByPeriod[period],
            timezone: JAKARTA_TIMEZONE
          }
        },
        amount: { $sum: '$amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray()

  const categoryRows = await categories.find({ userId, kind: 'expense' }).project({
    _id: 1,
    name: 1,
    color: 1
  }).toArray()
  const categoryMap = new Map(
    categoryRows.map(row => [toObjectIdString(row._id), { name: row.name, color: row.color }])
  )

  const categorySpendRows = await transactions.aggregate<{ _id: ObjectId | string | null, amount: number }>([
    {
      $match: {
        userId,
        kind: 'expense',
        occurredAt: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: '$categoryId',
        amount: { $sum: '$amount' }
      }
    },
    { $sort: { amount: -1 } }
  ]).toArray()

  const fallbackColors = ['#0EA5E9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6']
  const categoriesSummary = categorySpendRows.map((row, index) => {
    const key = toObjectIdString(row._id || undefined)
    const meta = categoryMap.get(key)
    return {
      label: meta?.name || 'Other',
      amount: row.amount,
      color: meta?.color || fallbackColors[index % fallbackColors.length]
    }
  })

  const monthRange = getMonthRange(end)
  const activeBudget = await budgets.findOne({
    userId,
    scope: 'overall',
    period: 'monthly',
    startDate: { $lte: monthRange.end },
    endDate: { $gte: monthRange.start }
  }, {
    sort: { endDate: -1 }
  })

  const monthlySpent = await sumTransactionsByRange(
    transactions,
    userId,
    monthRange.start,
    monthRange.end,
    'expense'
  )
  const budgetLimit = activeBudget?.limitAmount ?? 0
  const budgetProgress = budgetLimit > 0
    ? Math.min(Math.round((monthlySpent / budgetLimit) * 100), 100)
    : 0
  const thresholds = (activeBudget?.alertThresholds || [70, 90]).slice().sort((a, b) => a - b)
  const warningThreshold = thresholds[0] ?? 70
  const criticalThreshold = thresholds[1] ?? 90
  const budgetStatus = budgetProgress >= criticalThreshold
    ? 'critical'
    : budgetProgress >= warningThreshold
      ? 'warning'
      : 'healthy'

  const latestRows = await transactions.find({
    userId,
    kind: 'expense',
    occurredAt: {
      $gte: start,
      $lte: end
    }
  }).sort({ occurredAt: -1 }).limit(5).toArray()

  const latestTransactions = latestRows.map((item, index) => {
    const category = categoryMap.get(toObjectIdString(item.categoryId))
    return {
      id: toObjectIdString(item._id) || `txn-${index + 1}`,
      date: item.occurredAt,
      expenseType: category?.name || 'Other',
      amount: item.amount,
      description: item.note || '-'
    }
  })

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
        title: 'Total Balance',
        icon: 'i-lucide-wallet',
        value: totalBalance,
        variation: 0
      },
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
      accounts: accountsBreakdown.map(account => ({
        id: toObjectIdString(account._id),
        name: account.name,
        type: account.type,
        balance: account.balance
      }))
    },
    budget: {
      limit: budgetLimit,
      spent: monthlySpent,
      remaining: Math.max(budgetLimit - monthlySpent, 0),
      progress: budgetProgress,
      status: budgetStatus,
      thresholds: {
        warning: warningThreshold,
        critical: criticalThreshold
      }
    },
    chart: chart.map(item => ({
      date: item._id.toISOString(),
      amount: item.amount
    })),
    categories: categoriesSummary,
    latestTransactions: latestTransactions.map(item => ({
      ...item,
      date: item.date.toISOString()
    }))
  }
})
