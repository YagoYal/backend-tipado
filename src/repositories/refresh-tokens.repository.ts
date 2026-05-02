import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '../db'
import { refreshTokensTable } from '../db/schema'

export type CreateRefreshTokenInput = {
  id: string
  tokenHash: string
  userId: string
  expiresAt: Date
}

export const refreshTokensRepository = {
  create: async (data: CreateRefreshTokenInput) => {
    const result = await db.insert(refreshTokensTable).values(data).returning()
    return result[0]
  },

  findActiveByHash: async (tokenHash: string) => {
    const result = await db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.tokenHash, tokenHash),
          isNull(refreshTokensTable.revokedAt),
          gt(refreshTokensTable.expiresAt, new Date()),
        ),
      )
    return result[0] ?? null
  },

  revokeByHash: async (tokenHash: string) => {
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.tokenHash, tokenHash))
  },

  revokeAllByUserId: async (userId: string) => {
    await db
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokensTable.userId, userId), isNull(refreshTokensTable.revokedAt)))
  },
}
