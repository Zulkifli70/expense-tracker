import * as z from 'zod'
import { getMongoDb } from '../../utils/mongodb'

const payloadSchema = z.object({
  accountName: z.string().min(2),
  accountType: z.string().min(2).default('cash'),
  amount: z.number().positive()
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

  const userId = config.mongodbDefaultUserId
  const payload = parsed.data
  const db = await getMongoDb()
  const accounts = db.collection(config.mongodbAccountsCollection)

  const now = new Date()
  await accounts.updateOne(
    {
      userId,
      name: payload.accountName
    },
    {
      $setOnInsert: {
        userId,
        name: payload.accountName,
        type: payload.accountType,
        createdAt: now
      },
      $inc: {
        balance: payload.amount
      },
      $set: {
        isArchived: false,
        updatedAt: now
      }
    },
    { upsert: true }
  )

  setResponseStatus(event, 201)
  return {
    ok: true
  }
})
