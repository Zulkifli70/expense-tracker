import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MongoClient } from 'mongodb'

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

async function ensureCollection(db, name) {
  const exists = await db.listCollections({ name }).hasNext()
  if (!exists) {
    await db.createCollection(name)
    console.log(`Created collection: ${name}`)
  }
}

async function main() {
  loadDotEnv()

  const mongoUri = process.env.MONGODB_URI || process.env.MONGOURI
  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGOURI is required in environment')
  }

  const dbName = process.env.MONGODB_DB || 'ExpensesData'
  const names = {
    users: process.env.MONGODB_USERS_COLLECTION || 'users',
    accounts: process.env.MONGODB_ACCOUNTS_COLLECTION || 'accounts',
    categories: process.env.MONGODB_CATEGORIES_COLLECTION || 'categories',
    transactions: process.env.MONGODB_TRANSACTIONS_COLLECTION || 'transactions',
    budgets: process.env.MONGODB_BUDGETS_COLLECTION || 'budgets',
    budgetUsages: process.env.MONGODB_BUDGET_USAGES_COLLECTION || 'budget_usages'
  }

  const client = new MongoClient(mongoUri)
  await client.connect()

  try {
    const db = client.db(dbName)

    await Promise.all(Object.values(names).map(name => ensureCollection(db, name)))

    await db.collection(names.users).createIndex({ email: 1 }, { unique: true, name: 'uniq_email' })
    await db.collection(names.accounts).createIndex({ userId: 1, isArchived: 1 }, { name: 'user_archived' })
    await db.collection(names.categories).createIndex(
      { userId: 1, kind: 1, name: 1 },
      { unique: true, name: 'uniq_user_kind_name' }
    )
    await db.collection(names.transactions).createIndex({ userId: 1, occurredAt: -1 }, { name: 'user_date_desc' })
    await db.collection(names.transactions).createIndex({ userId: 1, kind: 1, occurredAt: -1 }, { name: 'user_kind_date_desc' })
    await db.collection(names.transactions).createIndex(
      { userId: 1, categoryId: 1, occurredAt: -1 },
      { name: 'user_category_date_desc' }
    )
    await db.collection(names.transactions).createIndex({ accountId: 1, occurredAt: -1 }, { name: 'account_date_desc' })
    await db.collection(names.budgets).createIndex(
      { userId: 1, period: 1, startDate: 1, endDate: 1 },
      { name: 'user_period_range' }
    )
    await db.collection(names.budgetUsages).createIndex(
      { budgetId: 1, periodKey: 1 },
      { unique: true, name: 'uniq_budget_period' }
    )

    console.log(`Indexes are ready in database: ${dbName}`)
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
