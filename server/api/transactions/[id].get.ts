import { ObjectId } from 'mongodb'
import { getMongoDb } from '../../utils/mongodb'

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

function toObjectIdString(id: ObjectId | string | undefined) {
  if (!id) return ''
  return typeof id === 'string' ? id : id.toHexString()
}

function toMaybeObjectId(id: ObjectId | string | undefined) {
  const text = toObjectIdString(id)
  if (!text || !ObjectId.isValid(text)) return null
  return new ObjectId(text)
}

export default eventHandler(async (event) => {
  const config = useRuntimeConfig()
  const userId = config.mongodbDefaultUserId
  const id = getRouterParam(event, 'id')

  if (!id || !ObjectId.isValid(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid transaction id'
    })
  }

  const db = await getMongoDb()
  const transactions = db.collection<TransactionDocument>(config.mongodbTransactionsCollection)
  const categories = db.collection<CategoryDocument>(config.mongodbCategoriesCollection)
  const accounts = db.collection<AccountDocument>(config.mongodbAccountsCollection)

  const txn = await transactions.findOne({
    _id: new ObjectId(id),
    userId
  })

  if (!txn) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Transaction not found'
    })
  }

  const categoryId = toMaybeObjectId(txn.categoryId)
  const accountId = toMaybeObjectId(txn.accountId)

  const [category, account] = await Promise.all([
    categoryId
      ? categories.findOne({ _id: categoryId, userId })
      : null,
    accountId
      ? accounts.findOne({ _id: accountId, userId })
      : null
  ])

  return {
    id: toObjectIdString(txn._id),
    date: txn.occurredAt.toISOString(),
    accountName: account?.name || 'Cash Wallet',
    category: category?.name || 'Other',
    description: txn.note || '-',
    note: txn.note || '',
    kind: txn.kind,
    amount: txn.kind === 'income' ? txn.amount : -txn.amount
  }
})
