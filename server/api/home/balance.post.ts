import * as z from 'zod'
import { addDemoBalance, getDemoStateForUser } from '../../utils/demo'
import { getMongoDb } from '../../utils/mongodb'
import { requireAuthContext } from '../../utils/session'

const payloadSchema = z.object({
  accountName: z.string().min(2),
  accountType: z.string().min(2).default('cash'),
  amount: z.number().positive()
})

export default eventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { userId, session, isDemo } = await requireAuthContext(event)
  const body = await readBody(event)
  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  if (isDemo) {
    const state = getDemoStateForUser(session.user)
    if (!state) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    setResponseStatus(event, 201)
    return addDemoBalance(state, parsed.data)
  }

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
