import { randomUUID } from 'node:crypto'
import z from 'zod'
import { FastifyTypedInstance } from '../../types'
import { usersService } from '../../services/users.service'
import { authService } from '../../services/auth.service'
import { env } from '../../config/env'

export async function authRoutes(app: FastifyTypedInstance) {
  app.post(
    '/auth/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        description: 'Authenticate and receive access + refresh tokens',
        body: z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }),
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body
      const user = await usersService.verifyCredentials(email, password)

      const jti = randomUUID()
      const accessToken = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          pwdAt: user.passwordChangedAt.getTime(),
          jti,
        },
        { expiresIn: env.JWT_EXPIRES_IN },
      )
      const refreshToken = await authService.createRefreshToken(user.id)

      return reply.send({ accessToken, refreshToken })
    },
  )

  app.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        description: 'Rotate refresh token and receive a new access token',
        body: z.object({ refreshToken: z.string() }),
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body
      const { user, newRawToken } = await authService.rotateRefreshToken(refreshToken)

      const jti = randomUUID()
      const accessToken = app.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          pwdAt: user.passwordChangedAt.getTime(),
          jti,
        },
        { expiresIn: env.JWT_EXPIRES_IN },
      )

      return reply.send({ accessToken, refreshToken: newRawToken })
    },
  )

  app.post(
    '/auth/logout',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        description: 'Revoke session: blacklists access token and revokes refresh token',
        body: z.object({ refreshToken: z.string() }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const { jti, exp } = request.user
      await authService.logout(jti, exp!, request.body.refreshToken)
      return reply.status(204).send(null)
    },
  )
}
