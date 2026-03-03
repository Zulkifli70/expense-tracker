import { ObjectId } from 'mongodb'
import { getMongoDb } from './mongodb'

type UserDocument = {
  _id: string
  email: string
  emailLower: string
  username: string
  usernameLower: string
  name: string
  passwordHash?: string
  createdAt: Date
  updatedAt: Date
}

export type AuthUser = {
  id: string
  email: string
  username: string
  name: string
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export async function getUsersCollection() {
  const config = useRuntimeConfig()
  const db = await getMongoDb()
  return db.collection<UserDocument>(config.mongodbUsersCollection)
}

export function toAuthUser(user: Pick<UserDocument, '_id' | 'email' | 'username' | 'name'>): AuthUser {
  return {
    id: user._id,
    email: user.email,
    username: user.username,
    name: user.name
  }
}

export function createUserId() {
  return new ObjectId().toHexString()
}

export type { UserDocument }
