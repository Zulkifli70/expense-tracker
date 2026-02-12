import { ObjectId } from 'mongodb'
import * as z from 'zod'
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
  balance: number
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
  updatedAt?: Date
}

const payloadSchema = z.object({
  accountName: z.string().min(2).optional(),
  categoryName: z.string().min(2),
  amount: z.number().positive(),
  note: z.string().trim().max(200).optional(),
  occurredAt: z.string().datetime()
})

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
  const body = await readBody(event)
  const parsed = payloadSchema.safeParse(body)

  if (!id || !ObjectId.isValid(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid transaction id'
    })
  }

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  const payload = parsed.data
  const now = new Date()
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

  const targetAccountName = payload.accountName || 'Cash Wallet'
  const accountResult = await accounts.findOneAndUpdate(
    {
      userId,
      name: targetAccountName
    },
    {
      $setOnInsert: {
        userId,
        name: targetAccountName,
        type: 'cash',
        balance: 0,
        createdAt: now
      },
      $set: {
        isArchived: false,
        updatedAt: now
      }
    },
    {
      upsert: true,
      returnDocument: 'after'
    }
  )

  if (!accountResult?._id) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to resolve account'
    })
  }

  const categoryResult = await categories.findOneAndUpdate(
    {
      userId,
      kind: txn.kind,
      name: payload.categoryName
    },
    {
      $setOnInsert: {
        userId,
        kind: txn.kind,
        name: payload.categoryName,
        color: '#0EA5E9',
        createdAt: now
      }
    },
    {
      upsert: true,
      returnDocument: 'after'
    }
  )

  const previousAccountId = toMaybeObjectId(txn.accountId)
  const nextAccountId = accountResult._id
  const previousImpact = amountImpact(txn.kind, txn.amount)
  const nextImpact = amountImpact(txn.kind, payload.amount)

  if (previousAccountId && previousAccountId.toHexString() === nextAccountId.toHexString()) {
    const delta = nextImpact - previousImpact
    if (delta !== 0) {
      await accounts.updateOne(
        { _id: nextAccountId, userId },
        {
          $inc: { balance: delta },
          $set: { updatedAt: now }
        }
      )
    }
  } else {
    if (previousAccountId) {
      await accounts.updateOne(
        { _id: previousAccountId, userId },
        {
          $inc: { balance: -previousImpact },
          $set: { updatedAt: now }
        }
      )
    }

    await accounts.updateOne(
      { _id: nextAccountId, userId },
      {
        $inc: { balance: nextImpact },
        $set: { updatedAt: now }
      }
    )
  }

  await transactions.updateOne(
    { _id: txn._id, userId },
    {
      $set: {
        accountId: accountResult._id,
        categoryId: categoryResult?._id,
        amount: payload.amount,
        note: payload.note || '',
        occurredAt: new Date(payload.occurredAt),
        updatedAt: now
      }
    }
  )

  return {
    ok: true,
    id,
    amount: -payload.amount
  }
})
