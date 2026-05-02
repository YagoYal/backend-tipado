import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../../errors/app-error'

export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({ message: 'Validation error', issues: error.issues })
  }

  // fastify-type-provider-zod returns { error: ZodError }; Fastify wraps it in
  // FST_ERR_VALIDATION with .validation pointing to the original ZodError.
  const fe = error as FastifyError
  if (fe.validation instanceof ZodError) {
    return reply.status(400).send({ message: 'Validation error', issues: fe.validation.issues })
  }

  // Other FastifyErrors: JWT (401), rate-limit (429), not-found (404), etc.
  if (fe.statusCode) {
    return reply.status(fe.statusCode).send({ message: error.message })
  }

  reply.log.error(error)
  return reply.status(500).send({ message: 'Internal server error' })
}
