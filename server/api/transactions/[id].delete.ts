import { ObjectId } from 'mongodb'
import { getMongoDb } from '../../utils/mongodb'

type AccountDocument = {
  _id?: ObjectId
  userId: string
  balance: number
}

type TransactionDocument = {
  _id?: ObjectId
  userId: string
  accountId?: ObjectId | string
  kind: 'expense' | 'income'
  amount: number
}

function amountImpact(kind: 'expense' | 'income', amount: number) {
  return kind === 'income' ? amount : -amount
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
  const accounts = db.collection<AccountDocument>(config.mongodbAccountsCollection)
  const now = new Date()

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

  const accountId = toMaybeObjectId(txn.accountId)
  if (accountId) {
    const impact = amountImpact(txn.kind, txn.amount)
    await accounts.updateOne(
      { _id: accountId, userId },
      {
        $inc: { balance: -impact },
        $set: { updatedAt: now }
      }
    )
  }

  await transactions.deleteOne({
    _id: txn._id,
    userId
  })

  return { ok: true }
})
