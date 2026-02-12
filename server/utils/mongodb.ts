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

type MongoConnectionOptions = {
  serverSelectionTimeoutMS?: number
  family?: 4 | 6
}

async function connectMongoClient(mongoUri: string, options: MongoConnectionOptions = {}) {
  const client = new MongoClient(mongoUri, options as any)
  try {
    await client.connect()
    return client
  }
  catch (error) {
    await client.close().catch(() => {})
    throw error
  }
}

function isTlsInternalError(error: unknown) {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return message.includes('tlsv1 alert internal error')
    || message.includes('err_ssl_tlsv1_alert_internal_error')
}

function toMongoConnectError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  const atlasNetworkHint = normalized.includes('tlsv1 alert internal error')
    || normalized.includes('err_ssl_tlsv1_alert_internal_error')
    || normalized.includes('server selection timed out')

  return createError({
    statusCode: 503,
    statusMessage: atlasNetworkHint
      ? 'MongoDB connection failed. Check Atlas IP Access List and MONGODB_URI in Vercel.'
      : 'MongoDB connection failed',
    data: {
      cause: message
    }
  })
}

export function getMongoClient() {
  if (!globalThis._mongoClientPromise) {
    const config = useRuntimeConfig()
    const mongoUri = getRequiredMongoUri()
    const serverSelectionTimeoutMS = Number(config.mongodbServerSelectionTimeoutMs || 10_000)
    const configuredFamily = Number(config.mongodbIpFamily || 0)
    const baseOptions: MongoConnectionOptions = {
      serverSelectionTimeoutMS
    }

    globalThis._mongoClientPromise = (async () => {
      try {
        if (configuredFamily === 4 || configuredFamily === 6) {
          return await connectMongoClient(mongoUri, {
            ...baseOptions,
            family: configuredFamily as 4 | 6
          })
        }

        try {
          return await connectMongoClient(mongoUri, baseOptions)
        }
        catch (error) {
          if (!isTlsInternalError(error)) {
            throw error
          }

          // Retry once using IPv4 only for SRV/TLS handshake issues in some serverless networks.
          return await connectMongoClient(mongoUri, {
            ...baseOptions,
            family: 4
          })
        }
      }
      catch (error) {
        throw toMongoConnectError(error)
      }
    })().catch((error) => {
      globalThis._mongoClientPromise = undefined
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
