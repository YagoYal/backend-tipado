import z from 'zod'
import { FastifyTypedInstance } from '../../types'

export async function healthRoutes(app: FastifyTypedInstance) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        description: 'Health check',
        response: {
          200: z.object({
            status: z.literal('ok'),
            timestamp: z.number(),
          }),
        },
      },
    },
    async (_request, reply) => {
      return reply.send({ status: 'ok', timestamp: Date.now() })
    },
  )
}
