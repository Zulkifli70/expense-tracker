import { MongoClient } from 'mongodb'

declare global {
  // Reuse connection during hot-reload in dev.
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function getRequiredMongoUri() {
  const config = useRuntimeConfig()

  if (!config.mongodbUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing MongoDB connection string'
    })
  }

  return config.mongodbUri
}

export function getMongoClient() {
  if (!globalThis._mongoClientPromise) {
    const mongoUri = getRequiredMongoUri()
    const client = new MongoClient(mongoUri)
    globalThis._mongoClientPromise = client.connect()
  }

  return globalThis._mongoClientPromise
}

export async function getMongoDb() {
  const client = await getMongoClient()
  const config = useRuntimeConfig()

  return client.db(config.mongodbDb || 'ExpensesData')
}
