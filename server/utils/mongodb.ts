import { MongoClient } from 'mongodb'

declare global {
  // Reuse connection during hot-reload in dev.
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function getRequiredMongoUri() {
  const config = useRuntimeConfig()
  const rawUri = String(config.mongodbUri || '').trim()
  const normalizedUri = rawUri
    .replace(/^['"]+/, '')
    .replace(/['"]+$/, '')
    .trim()

  if (!normalizedUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing MongoDB connection string'
    })
  }

  if (!normalizedUri.startsWith('mongodb://') && !normalizedUri.startsWith('mongodb+srv://')) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid MongoDB connection string'
    })
  }

  return normalizedUri
}

export function getMongoClient() {
  if (!globalThis._mongoClientPromise) {
    const mongoUri = getRequiredMongoUri()
    const client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 10_000
    })
    globalThis._mongoClientPromise = client.connect().catch(async (error) => {
      globalThis._mongoClientPromise = undefined
      await client.close().catch(() => {})
      throw error
    })
  }

  return globalThis._mongoClientPromise
}

export async function getMongoDb() {
  const client = await getMongoClient()
  const config = useRuntimeConfig()

  return client.db(config.mongodbDb || 'ExpensesData')
}
