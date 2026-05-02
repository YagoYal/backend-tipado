import { readFileSync } from 'node:fs'
import { fastify } from 'fastify'
import { fastifyCors } from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyJwt from '@fastify/jwt'
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { env } from './config/env'
import { errorHandler } from './http/middlewares/error-handler'
import { sanitizeBody } from './http/middlewares/sanitize'
import { registerAuditLog } from './http/middlewares/audit-log'
import { usersRoutes } from './http/routes/users.route'
import { authRoutes } from './http/routes/auth.route'
import { healthRoutes } from './http/routes/health.route'
import { usersRepository } from './repositories/users.repository'
import { authService } from './services/auth.service'
import { closeDb } from './db'
import { closeRedis } from './db/redis'

export interface BuildAppOptions {
  logger?: boolean | object
}

export function buildApp(opts: BuildAppOptions = {}) {
  const httpsOptions =
    env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH
      ? {
          https: {
            key: readFileSync(env.HTTPS_KEY_PATH),
            cert: readFileSync(env.HTTPS_CERT_PATH),
          },
        }
      : {}

  const app = fastify({
    logger: opts.logger ?? true,
    ...httpsOptions,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.setErrorHandler(errorHandler)

  app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })

  if (env.NODE_ENV !== 'test') {
    app.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' })
  }

  app.register(fastifyCors, { origin: env.CORS_ORIGIN })
  app.register(fastifyJwt, { secret: env.JWT_SECRET })

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()

      const payload = request.user
      const [blacklisted, user] = await Promise.all([
        authService.isBlacklisted(payload.jti),
        usersRepository.findById(payload.sub),
      ])

      if (blacklisted) return reply.status(401).send({ message: 'Token revoked' })
      if (!user) return reply.status(401).send({ message: 'User not found' })

      if (user.passwordChangedAt.getTime() > payload.pwdAt) {
        return reply.status(401).send({ message: 'Password changed — please login again' })
      }
    } catch (err) {
      reply.send(err)
    }
  })

  app.addHook('preValidation', async (request) => {
    if (request.body) request.body = sanitizeBody(request.body)
  })

  registerAuditLog(app)

  app.register(fastifySwagger, {
    openapi: { info: { title: 'Typed API', version: '1.0.0' } },
    transform: jsonSchemaTransform,
  })

  app.register(fastifySwaggerUi, { routePrefix: '/docs' })
  app.register(healthRoutes)
  app.register(authRoutes)
  app.register(usersRoutes)

  app.addHook('onClose', async () => {
    await Promise.all([closeDb(), closeRedis()])
  })

  return app
}
