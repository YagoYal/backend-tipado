import {
  FastifyBaseLogger,
  FastifyRequest,
  FastifyReply,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { FastifyInstance } from 'fastify/types/instance'

export type JwtPayload = {
  sub: string
  email: string
  name: string
  pwdAt: number
  jti: string
  exp?: number
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export type FastifyTypedInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>
