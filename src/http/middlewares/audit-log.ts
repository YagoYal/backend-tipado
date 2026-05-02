import { FastifyInstance } from 'fastify'

export function registerAuditLog(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    request.log.info({
      type: 'audit:request',
      method: request.method,
      url: request.url,
      ip: request.ip,
    })
  })

  app.addHook('onResponse', async (request, reply) => {
    const user = (request.user as { sub?: string } | undefined)?.sub ?? 'anonymous'

    request.log.info({
      type: 'audit:response',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTimeMs: Math.round(reply.elapsedTime),
      user,
    })
  })
}
