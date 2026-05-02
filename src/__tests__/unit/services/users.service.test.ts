import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../repositories/users.repository', () => ({
  usersRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updatePassword: vi.fn(),
  },
}))

vi.mock('../../../services/auth.service', () => ({
  authService: {
    revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

import { usersService } from '../../../services/users.service'
import { usersRepository } from '../../../repositories/users.repository'
import { ConflictError, NotFoundError } from '../../../errors/app-error'
import bcrypt from 'bcryptjs'

const mockRepo = vi.mocked(usersRepository)
const mockBcrypt = vi.mocked(bcrypt)

const fakeUser = {
  id: 'uuid-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: 'hashed_pw',
  passwordChangedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── listAll ──────────────────────────────────────────────────────────────────

describe('usersService.listAll', () => {
  it('calls findAll with correct limit and offset for page 1', async () => {
    mockRepo.findAll.mockResolvedValue([])
    await usersService.listAll(1, 20)
    expect(mockRepo.findAll).toHaveBeenCalledWith(20, 0)
  })

  it('calculates offset correctly for page 2', async () => {
    mockRepo.findAll.mockResolvedValue([])
    await usersService.listAll(2, 10)
    expect(mockRepo.findAll).toHaveBeenCalledWith(10, 10)
  })

  it('calculates offset correctly for page 3', async () => {
    mockRepo.findAll.mockResolvedValue([])
    await usersService.listAll(3, 5)
    expect(mockRepo.findAll).toHaveBeenCalledWith(5, 10)
  })
})

// ─── create ───────────────────────────────────────────────────────────────────

describe('usersService.create', () => {
  it('throws ConflictError when email already exists', async () => {
    mockRepo.findByEmail.mockResolvedValue(fakeUser)
    await expect(usersService.create('Name', 'test@example.com', 'pass')).rejects.toThrow(
      ConflictError,
    )
  })

  it('hashes the password with salt rounds 10', async () => {
    mockRepo.findByEmail.mockResolvedValue(null as never)
    mockBcrypt.hash.mockResolvedValue('hashed_pw' as never)
    mockRepo.create.mockResolvedValue({
      id: 'uuid-1',
      name: 'Name',
      email: 'new@example.com',
      createdAt: new Date(),
    })

    await usersService.create('Name', 'new@example.com', 'plainpassword')

    expect(mockBcrypt.hash).toHaveBeenCalledWith('plainpassword', 10)
  })

  it('calls repository.create with the hashed password', async () => {
    mockRepo.findByEmail.mockResolvedValue(null as never)
    mockBcrypt.hash.mockResolvedValue('hashed_pw' as never)
    const created = { id: 'uuid-1', name: 'Name', email: 'new@example.com', createdAt: new Date() }
    mockRepo.create.mockResolvedValue(created)

    const result = await usersService.create('Name', 'new@example.com', 'plainpassword')

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed_pw', email: 'new@example.com' }),
    )
    expect(result).toEqual(created)
  })
})

// ─── verifyCredentials ────────────────────────────────────────────────────────

describe('usersService.verifyCredentials', () => {
  it('throws NotFoundError when user does not exist', async () => {
    mockRepo.findByEmail.mockResolvedValue(null as never)
    await expect(usersService.verifyCredentials('nobody@example.com', 'pass')).rejects.toThrow(
      NotFoundError,
    )
  })

  it('throws ConflictError when password is wrong', async () => {
    mockRepo.findByEmail.mockResolvedValue(fakeUser)
    mockBcrypt.compare.mockResolvedValue(false as never)
    await expect(usersService.verifyCredentials('test@example.com', 'wrong')).rejects.toThrow(
      ConflictError,
    )
  })

  it('returns user data without passwordHash on success', async () => {
    mockRepo.findByEmail.mockResolvedValue(fakeUser)
    mockBcrypt.compare.mockResolvedValue(true as never)

    const result = await usersService.verifyCredentials('test@example.com', 'correct')

    expect(result).toEqual({
      id: fakeUser.id,
      email: fakeUser.email,
      name: fakeUser.name,
      passwordChangedAt: fakeUser.passwordChangedAt,
    })
    expect(result).not.toHaveProperty('passwordHash')
  })
})

// ─── changePassword ───────────────────────────────────────────────────────────

describe('usersService.changePassword', () => {
  it('throws NotFoundError when user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null as never)
    await expect(usersService.changePassword('uuid-1', 'current', 'new')).rejects.toThrow(
      NotFoundError,
    )
  })

  it('throws ConflictError when current password is wrong', async () => {
    mockRepo.findById.mockResolvedValue(fakeUser)
    mockBcrypt.compare.mockResolvedValue(false as never)
    await expect(usersService.changePassword('uuid-1', 'wrong', 'new')).rejects.toThrow(
      ConflictError,
    )
  })

  it('hashes the new password and calls updatePassword', async () => {
    mockRepo.findById.mockResolvedValue(fakeUser)
    mockBcrypt.compare.mockResolvedValue(true as never)
    mockBcrypt.hash.mockResolvedValue('new_hashed_pw' as never)
    mockRepo.updatePassword.mockResolvedValue(undefined)

    await usersService.changePassword('uuid-1', 'current', 'newpassword')

    expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword', 10)
    expect(mockRepo.updatePassword).toHaveBeenCalledWith('uuid-1', 'new_hashed_pw')
  })
})
