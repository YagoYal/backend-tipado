import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { ConflictError, NotFoundError } from '../errors/app-error'
import { usersRepository } from '../repositories/users.repository'
import { authService } from './auth.service'

export const usersService = {
  listAll: (page: number, limit: number) => {
    const offset = (page - 1) * limit
    return usersRepository.findAll(limit, offset)
  },

  create: async (name: string, email: string, password: string) => {
    const existing = await usersRepository.findByEmail(email)
    if (existing) throw new ConflictError('Email already in use')

    const passwordHash = await bcrypt.hash(password, 10)
    return usersRepository.create({ id: randomUUID(), name, email, passwordHash })
  },

  verifyCredentials: async (email: string, password: string) => {
    const user = await usersRepository.findByEmail(email)
    if (!user) throw new NotFoundError('User')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new ConflictError('Invalid credentials')

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordChangedAt: user.passwordChangedAt,
    }
  },

  changePassword: async (id: string, currentPassword: string, newPassword: string) => {
    const user = await usersRepository.findById(id)
    if (!user) throw new NotFoundError('User')

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new ConflictError('Invalid current password')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await usersRepository.updatePassword(id, passwordHash)
    await authService.revokeAllUserTokens(id)
  },
}
