import { ObjectId } from 'mongodb'
import * as z from 'zod'
import { getMongoDb } from '../../utils/mongodb'

const payloadSchema = z.object({
  accountName: z.string().min(2),
  categoryName: z.string().min(2),
  amount: z.number().positive(),
  note: z.string().trim().max(200).optional(),
  occurredAt: z.string().datetime().optional()
})

export default eventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  const payload = parsed.data
  const userId = config.mongodbDefaultUserId
  const db = await getMongoDb()
  const accounts = db.collection(config.mongodbAccountsCollection)
  const categories = db.collection(config.mongodbCategoriesCollection)
  const transactions = db.collection(config.mongodbTransactionsCollection)

  const now = new Date()
  const accountResult = await accounts.findOneAndUpdate(
    {
      userId,
      name: payload.accountName
    },
    {
      $setOnInsert: {
        userId,
        name: payload.accountName,
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
      kind: 'expense',
      name: payload.categoryName
    },
    {
      $setOnInsert: {
        userId,
        kind: 'expense',
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

  const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : now

  const inserted = await transactions.insertOne({
    _id: new ObjectId(),
    userId,
    accountId: accountResult._id,
    categoryId: categoryResult?._id,
    kind: 'expense',
    amount: payload.amount,
    note: payload.note || '',
    occurredAt,
    createdAt: now,
    updatedAt: now
  })

  await accounts.updateOne(
    { _id: accountResult._id },
    {
      $inc: {
        balance: -payload.amount
      },
      $set: {
        updatedAt: now
      }
    }
  )

  setResponseStatus(event, 201)
  return {
    ok: true,
    id: inserted.insertedId.toHexString()
  }
})
