import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  passwordChangedAt: timestamp('password_changed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const refreshTokensTable = pgTable('refresh_tokens', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
