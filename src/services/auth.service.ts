import { createHash, randomUUID } from 'node:crypto'
import { redis } from '../db/redis'
import { refreshTokensRepository } from '../repositories/refresh-tokens.repository'
import { usersRepository } from '../repositories/users.repository'
import { AppError, NotFoundError } from '../errors/app-error'
import { env } from '../config/env'

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

function parseExpiryMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`)
  const value = parseInt(match[1])
  const multipliers: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  return value * multipliers[match[2]]
}

export const authService = {
  createRefreshToken: async (userId: string): Promise<string> => {
    const raw = randomUUID()
    await refreshTokensRepository.create({
      id: randomUUID(),
      tokenHash: hashToken(raw),
      userId,
      expiresAt: new Date(Date.now() + parseExpiryMs(env.JWT_REFRESH_EXPIRES_IN)),
    })
    return raw
  },

  rotateRefreshToken: async (rawToken: string) => {
    const tokenHash = hashToken(rawToken)
    const stored = await refreshTokensRepository.findActiveByHash(tokenHash)
    if (!stored) throw new AppError('Invalid or expired refresh token', 401)

    const user = await usersRepository.findById(stored.userId)
    if (!user) throw new NotFoundError('User')

    await refreshTokensRepository.revokeByHash(tokenHash)

    const newRaw = randomUUID()
    await refreshTokensRepository.create({
      id: randomUUID(),
      tokenHash: hashToken(newRaw),
      userId: stored.userId,
      expiresAt: new Date(Date.now() + parseExpiryMs(env.JWT_REFRESH_EXPIRES_IN)),
    })

    return { user, newRawToken: newRaw }
  },

  isBlacklisted: async (jti: string): Promise<boolean> => {
    return (await redis.get(`blacklist:${jti}`)) !== null
  },

  blacklistToken: async (jti: string, exp: number): Promise<void> => {
    const ttl = Math.max(exp - Math.floor(Date.now() / 1000), 1)
    await redis.set(`blacklist:${jti}`, '1', 'EX', ttl)
  },

  logout: async (jti: string, exp: number, rawRefreshToken: string): Promise<void> => {
    await Promise.all([
      authService.blacklistToken(jti, exp),
      refreshTokensRepository.revokeByHash(hashToken(rawRefreshToken)),
    ])
  },

  revokeAllUserTokens: async (userId: string): Promise<void> => {
    await refreshTokensRepository.revokeAllByUserId(userId)
  },
}
