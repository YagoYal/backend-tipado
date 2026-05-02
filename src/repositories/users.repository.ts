import { eq } from 'drizzle-orm'
import { db } from '../db'
import { usersTable } from '../db/schema'

export type CreateUserInput = {
  id: string
  name: string
  email: string
  passwordHash: string
}

export const usersRepository = {
  findAll: (limit: number, offset: number) =>
    db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .limit(limit)
      .offset(offset),

  findById: async (id: string) => {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id))
    return result[0] ?? null
  },

  findByEmail: async (email: string) => {
    const result = await db.select().from(usersTable).where(eq(usersTable.email, email))
    return result[0] ?? null
  },

  create: async (data: CreateUserInput) => {
    const result = await db.insert(usersTable).values(data).returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
    })
    return result[0]
  },

  updatePassword: async (id: string, passwordHash: string) => {
    await db
      .update(usersTable)
      .set({ passwordHash, passwordChangedAt: new Date() })
      .where(eq(usersTable.id, id))
  },
}
