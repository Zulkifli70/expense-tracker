import type { ObjectId } from 'mongodb'
import * as z from 'zod'
import { getMongoDb } from '../utils/mongodb'

type CategoryDocument = {
  _id?: ObjectId
  userId: string
  kind: 'expense' | 'income'
  name: string
}

type AccountDocument = {
  _id?: ObjectId
  userId: string
  name: string
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

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine(value => [10, 20, 30].includes(value)).default(10),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  period: z.enum(['all_time', 'this_month']).default('this_month')
})

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

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildUtcDateRange(year: number, month: number, day: number) {
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    return null
  }
  return { start, end }
}

function parseDateSearch(search: string): {
  mode: 'full_date'
  range: { start: Date, end: Date }
} | {
  mode: 'day_month'
  day: number
  month: number
} | {
  mode: 'day_only'
  day: number
} | null {
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
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    const range = buildUtcDateRange(year, month, day)
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
  if (textMatch) {
    const day = Number(textMatch[1])
    const monthToken = textMatch[2].replace(/\./g, '')
    const month = MONTH_ALIAS_MAP[monthToken]
    if (!month || day < 1 || day > 31) return null

    if (textMatch[3]) {
      const year = Number(textMatch[3])
      const range = buildUtcDateRange(year, month, day)
      return range ? { mode: 'full_date', range } : null
    }

    return { mode: 'day_month', day, month }
  }

  return null
}

function toObjectIdString(id: ObjectId | string | undefined) {
  if (!id) return ''
  return typeof id === 'string' ? id : id.toHexString()
}

function getJakartaMonthRange(baseDate: Date) {
  const local = new Date(baseDate.getTime() + JAKARTA_OFFSET_MS)
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - JAKARTA_OFFSET_MS)
  const end = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - JAKARTA_OFFSET_MS - 1)
  return { start, end }
}

export default eventHandler(async (event) => {
  const config = useRuntimeConfig()
  const parsed = querySchema.safeParse(getQuery(event))

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query'
    })
  }

  const { page, pageSize, search, category, period } = parsed.data
  const userId = config.mongodbDefaultUserId
  const db = await getMongoDb()
  const transactions = db.collection<TransactionDocument>(config.mongodbTransactionsCollection)
  const accounts = db.collection<AccountDocument>(config.mongodbAccountsCollection)
  const categories = db.collection<CategoryDocument>(config.mongodbCategoriesCollection)

  const categoryRows = await categories.find({ userId, kind: 'expense' }).project({
    _id: 1,
    name: 1
  }).toArray()
  const accountRows = await accounts.find({ userId }).project({
    _id: 1,
    name: 1
  }).toArray()
  const categoryMap = new Map(
    categoryRows.map(row => [toObjectIdString(row._id), row.name])
  )
  const accountMap = new Map(
    accountRows.map(row => [toObjectIdString(row._id), row.name])
  )

  const filter: Record<string, any> = { userId }

  if (period === 'this_month') {
    const { start, end } = getJakartaMonthRange(new Date())
    filter.occurredAt = { $gte: start, $lte: end }
  }

  if (category && category !== 'all') {
    const matchedCategoryIds = categoryRows
      .filter(row => row.name === category)
      .map(row => row._id)

    filter.categoryId = {
      $in: [...matchedCategoryIds, ...matchedCategoryIds.map(id => id?.toHexString()).filter(Boolean)]
    }
  }

  if (search) {
    const escapedSearch = escapeRegex(search)
    const searchRegex = new RegExp(escapedSearch, 'i')
    const matchedCategoryIds = categoryRows
      .filter(row => searchRegex.test(row.name))
      .map(row => row._id)
      .filter((id): id is ObjectId => !!id)
    const parsedDateSearch = parseDateSearch(search)

    const orConditions: Record<string, any>[] = [
      { note: { $regex: escapedSearch, $options: 'i' } },
      ...(matchedCategoryIds.length
        ? [{
            categoryId: {
              $in: [
                ...matchedCategoryIds,
                ...matchedCategoryIds.map(id => id.toHexString())
              ]
            }
          }]
        : [])
    ]

    if (parsedDateSearch?.mode === 'full_date') {
      orConditions.push({
        occurredAt: {
          $gte: parsedDateSearch.range.start,
          $lte: parsedDateSearch.range.end
        }
      })
    }

    if (parsedDateSearch?.mode === 'day_month') {
      orConditions.push({
        $expr: {
          $and: [
            { $eq: [{ $dayOfMonth: '$occurredAt' }, parsedDateSearch.day] },
            { $eq: [{ $month: '$occurredAt' }, parsedDateSearch.month] }
          ]
        }
      })
    }

    if (parsedDateSearch?.mode === 'day_only') {
      orConditions.push({
        $expr: {
          $eq: [{ $dayOfMonth: '$occurredAt' }, parsedDateSearch.day]
        }
      })
    }

    filter.$or = orConditions
  }

  const total = await transactions.countDocuments(filter)
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const safePage = Math.min(page, totalPages)
  const skip = (safePage - 1) * pageSize

  const rows = await transactions.find(filter)
    .sort({ occurredAt: -1, _id: -1 })
    .skip(skip)
    .limit(pageSize)
    .toArray()

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    categories: ['all', ...categoryRows.map(row => row.name)],
    items: rows.map((item, index) => ({
      id: toObjectIdString(item._id) || `txn-${index + 1}`,
      date: item.occurredAt.toISOString(),
      accountName: accountMap.get(toObjectIdString(item.accountId)) || 'Cash Wallet',
      category: categoryMap.get(toObjectIdString(item.categoryId)) || 'Other',
      description: item.note || '-',
      note: item.note || '-',
      kind: item.kind,
      amount: item.kind === 'income' ? item.amount : -item.amount
    }))
  }
})
