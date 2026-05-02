import z from 'zod'
import { FastifyTypedInstance } from '../../types'
import { usersService } from '../../services/users.service'

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.date(),
})

export async function usersRoutes(app: FastifyTypedInstance) {
  app.get(
    '/users',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['users'],
        description: 'List users (paginated)',
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.array(userSchema),
        },
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query
      const users = await usersService.listAll(page, limit)
      return reply.send(users)
    },
  )

  app.post(
    '/users',
    {
      schema: {
        tags: ['users'],
        description: 'Create a user',
        body: z.object({
          name: z.string().min(2).max(100),
          email: z.string().email(),
          password: z.string().min(6).max(72),
        }),
        response: {
          201: userSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body
      const user = await usersService.create(name, email, password)
      return reply.status(201).send(user)
    },
  )

  app.patch(
    '/users/:id/password',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['users'],
        description: 'Change user password',
        params: z.object({ id: z.string() }),
        body: z.object({
          currentPassword: z.string().min(6),
          newPassword: z.string().min(6).max(72),
        }),
        response: {
          204: z.null(),
          403: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      if (request.user.sub !== id) {
        return reply.status(403).send({ message: 'Forbidden' })
      }
      const { currentPassword, newPassword } = request.body
      await usersService.changePassword(id, currentPassword, newPassword)
      return reply.status(204).send(null)
    },
  )
}
