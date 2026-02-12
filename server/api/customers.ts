import type { AvatarProps } from '@nuxt/ui'
import type { H3Event } from 'h3'
import type { ObjectId } from 'mongodb'
import * as z from 'zod'
import type { User, UserStatus } from '~/types'
import { getMongoDb } from '../utils/mongodb'

type CustomerDocument = {
  _id?: ObjectId
  id?: number
  name?: string
  email?: string
  status?: UserStatus
  location?: string
  avatar?: AvatarProps
}

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email'),
  status: z.enum(['subscribed', 'unsubscribed', 'bounced']).optional(),
  location: z.string().min(2).optional()
})

function normalizeCustomer(doc: CustomerDocument, fallbackId: number): User {
  return {
    id: doc.id ?? fallbackId,
    name: doc.name ?? 'Unknown User',
    email: doc.email ?? `unknown-${fallbackId}@example.com`,
    status: doc.status ?? 'subscribed',
    location: doc.location ?? 'Unknown',
    avatar: doc.avatar
  }
}

async function getCollection() {
  const db = await getMongoDb()
  const config = useRuntimeConfig()
  return db.collection<CustomerDocument>(config.mongodbCustomersCollection || 'UserData')
}

async function listCustomers() {
  const collection = await getCollection()
  const docs = await collection.find().sort({ id: 1, _id: 1 }).toArray()

  return docs.map((doc, index) => normalizeCustomer(doc, index + 1))
}

async function createCustomer(event: H3Event) {
  const collection = await getCollection()
  const body = await readBody(event)
  const parsed = createCustomerSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  const payload = parsed.data
  const email = payload.email.trim().toLowerCase()
  const existing = await collection.findOne({
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email already exists'
    })
  }

  const latestCustomer = await collection.find().sort({ id: -1, _id: -1 }).limit(1).next()
  const currentId = typeof latestCustomer?.id === 'number' ? latestCustomer.id : 0
  const nextId = currentId + 1

  const customer: User = {
    id: nextId,
    name: payload.name.trim(),
    email,
    status: payload.status ?? 'subscribed',
    location: payload.location?.trim() || 'Unknown'
  }

  await collection.insertOne(customer)
  setResponseStatus(event, 201)

  return customer
}

export default eventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return listCustomers()
  }

  if (method === 'POST') {
    return createCustomer(event)
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
