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
    const searchRegex = new RegExp(search, 'i')
    const matchedCategoryIds = categoryRows
      .filter(row => searchRegex.test(row.name))
      .map(row => row._id)
      .filter((id): id is ObjectId => !!id)

    filter.$or = [
      { note: { $regex: search, $options: 'i' } },
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
