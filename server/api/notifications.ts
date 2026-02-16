import { ObjectId } from 'mongodb'
import * as z from 'zod'
import { getMongoDb } from '../utils/mongodb'

type NotificationDocument = {
  _id?: ObjectId
  userId: string
  unread: boolean
  sender: {
    name: string
    avatarSrc?: string
  }
  body: string
  date: Date
  to?: string
  createdAt: Date
  updatedAt: Date
}

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
})

const createSchema = z.object({
  body: z.string().trim().min(1).max(240),
  senderName: z.string().trim().min(1).max(80).optional(),
  senderAvatarSrc: z.string().trim().url().optional(),
  date: z.string().datetime().optional(),
  to: z.string().trim().min(1).max(200).optional()
})

const markReadSchema = z.object({
  id: z.string().trim().min(1)
})

function toNotificationViewModel(row: NotificationDocument) {
  return {
    id: row._id?.toHexString() || '',
    unread: !!row.unread,
    sender: {
      name: row.sender?.name || 'Expense Tracker',
      avatar: row.sender?.avatarSrc
        ? { src: row.sender.avatarSrc }
        : undefined
    },
    body: row.body,
    date: row.date.toISOString(),
    to: row.to
  }
}

export default eventHandler(async (event) => {
  const config = useRuntimeConfig()
  const db = await getMongoDb()
  const userId = config.mongodbDefaultUserId
  const notifications = db.collection<NotificationDocument>(config.mongodbNotificationsCollection)
  const method = getMethod(event)

  if (method === 'GET') {
    const parsed = querySchema.safeParse(getQuery(event))
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query'
      })
    }

    const rows = await notifications
      .find({ userId })
      .sort({ date: -1, _id: -1 })
      .limit(parsed.data.limit)
      .toArray()

    return rows.map(toNotificationViewModel)
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
      })
    }

    const payload = parsed.data
    const now = new Date()
    const date = payload.date ? new Date(payload.date) : now

    const inserted = await notifications.insertOne({
      _id: new ObjectId(),
      userId,
      unread: true,
      sender: {
        name: payload.senderName || 'Expense Tracker',
        avatarSrc: payload.senderAvatarSrc
      },
      body: payload.body,
      date,
      to: payload.to,
      createdAt: now,
      updatedAt: now
    })

    const created = await notifications.findOne({
      _id: inserted.insertedId,
      userId
    })

    if (!created) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create notification'
      })
    }

    setResponseStatus(event, 201)
    return toNotificationViewModel(created)
  }

  if (method === 'PATCH') {
    const body = await readBody(event)
    const parsed = markReadSchema.safeParse(body)

    if (!parsed.success || !ObjectId.isValid(parsed.data.id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid notification id'
      })
    }

    const now = new Date()
    const updated = await notifications.findOneAndUpdate(
      {
        _id: new ObjectId(parsed.data.id),
        userId
      },
      {
        $set: {
          unread: false,
          updatedAt: now
        }
      },
      {
        returnDocument: 'after'
      }
    )

    if (!updated?._id) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Notification not found'
      })
    }

    return toNotificationViewModel(updated)
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed'
  })
})
