import * as z from 'zod'
import { getMongoDb } from '../../utils/mongodb'

const payloadSchema = z.object({
  limitAmount: z.number().positive(),
  warningThreshold: z.number().min(1).max(99).optional(),
  criticalThreshold: z.number().min(1).max(100).optional()
})
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

function monthRange(baseDate: Date) {
  const local = new Date(baseDate.getTime() + JAKARTA_OFFSET_MS)
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - JAKARTA_OFFSET_MS)
  const end = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - JAKARTA_OFFSET_MS - 1)
  return { start, end }
}

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
  const budgets = db.collection(config.mongodbBudgetsCollection)
  const now = new Date()
  const { start, end } = monthRange(now)

  let warning = payload.warningThreshold ?? 70
  let critical = payload.criticalThreshold ?? 90
  if (warning >= critical) {
    warning = 70
    critical = 90
  }

  await budgets.updateOne(
    {
      userId,
      scope: 'overall',
      period: 'monthly',
      startDate: start,
      endDate: end
    },
    {
      $setOnInsert: {
        userId,
        scope: 'overall',
        period: 'monthly',
        startDate: start,
        endDate: end,
        createdAt: now
      },
      $set: {
        limitAmount: payload.limitAmount,
        alertThresholds: [warning, critical],
        updatedAt: now
      }
    },
    { upsert: true }
  )

  return { ok: true }
})
