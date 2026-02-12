import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ObjectId, MongoClient } from 'mongodb'
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  const content = readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function monthRange(baseDate) {
  const local = new Date(baseDate.getTime() + JAKARTA_OFFSET_MS)
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - JAKARTA_OFFSET_MS)
  const end = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - JAKARTA_OFFSET_MS - 1)
  return { start, end }
}

async function main() {
  loadDotEnv()

  const mongoUri = process.env.MONGODB_URI || process.env.MONGOURI
  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGOURI is required in environment')
  }

  const dbName = process.env.MONGODB_DB || 'ExpensesData'
  const collection = {
    users: process.env.MONGODB_USERS_COLLECTION || 'users',
    accounts: process.env.MONGODB_ACCOUNTS_COLLECTION || 'accounts',
    categories: process.env.MONGODB_CATEGORIES_COLLECTION || 'categories',
    transactions: process.env.MONGODB_TRANSACTIONS_COLLECTION || 'transactions',
    budgets: process.env.MONGODB_BUDGETS_COLLECTION || 'budgets'
  }
  const userId = process.env.MONGODB_DEFAULT_USER_ID || 'demo-user'

  const client = new MongoClient(mongoUri)
  await client.connect()

  try {
    const db = client.db(dbName)
    const users = db.collection(collection.users)
    const accounts = db.collection(collection.accounts)
    const categories = db.collection(collection.categories)
    const transactions = db.collection(collection.transactions)
    const budgets = db.collection(collection.budgets)

    await users.updateOne(
      { _id: userId },
      {
        $setOnInsert: {
          _id: userId,
          email: 'demo-user@expense.local',
          name: 'Demo User',
          currency: 'IDR',
          timezone: 'Asia/Jakarta',
          createdAt: new Date()
        },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    )

    const accountTemplates = [
      { name: 'BCA Savings', type: 'bank', balance: 4500000 },
      { name: 'Cash Wallet', type: 'cash', balance: 1200000 },
      { name: 'E-Wallet', type: 'ewallet', balance: 2800000 }
    ]
    const accountIds = []

    for (const item of accountTemplates) {
      const result = await accounts.findOneAndUpdate(
        { userId, name: item.name },
        {
          $setOnInsert: {
            userId,
            name: item.name,
            type: item.type,
            createdAt: new Date()
          },
          $set: {
            balance: item.balance,
            isArchived: false,
            updatedAt: new Date()
          }
        },
        { upsert: true, returnDocument: 'after' }
      )
      if (result?._id) accountIds.push(result._id)
    }

    const categoryTemplates = [
      { name: 'Food', color: '#0EA5E9' },
      { name: 'Transport', color: '#22C55E' },
      { name: 'Utilities', color: '#F59E0B' },
      { name: 'Groceries', color: '#EF4444' },
      { name: 'Other', color: '#8B5CF6' }
    ]
    const categoryIds = []

    for (const item of categoryTemplates) {
      const result = await categories.findOneAndUpdate(
        { userId, kind: 'expense', name: item.name },
        {
          $setOnInsert: {
            userId,
            kind: 'expense',
            name: item.name,
            createdAt: new Date()
          },
          $set: {
            color: item.color
          }
        },
        { upsert: true, returnDocument: 'after' }
      )
      if (result?._id) categoryIds.push(result._id)
    }

    const { start, end } = monthRange(new Date())
    const monthlyLimit = 5500000
    await budgets.updateOne(
      { userId, scope: 'overall', period: 'monthly', startDate: start, endDate: end },
      {
        $setOnInsert: {
          userId,
          scope: 'overall',
          period: 'monthly',
          startDate: start,
          endDate: end,
          createdAt: new Date()
        },
        $set: {
          limitAmount: monthlyLimit,
          alertThresholds: [70, 90],
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    const existingCount = await transactions.countDocuments({
      userId,
      kind: 'expense',
      occurredAt: { $gte: start, $lte: end }
    })

    if (existingCount < 20 && accountIds.length && categoryIds.length) {
      const docs = []
      for (let i = 0; i < 36; i++) {
        const amount = 45000 + ((i * 17321) % 210000)
        docs.push({
          _id: new ObjectId(),
          userId,
          accountId: accountIds[i % accountIds.length],
          categoryId: categoryIds[i % categoryIds.length],
          kind: 'expense',
          amount,
          note: `Demo expense #${i + 1}`,
          occurredAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      await transactions.insertMany(docs)
    }

    console.log(`Demo home data is ready for userId: ${userId}`)
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
