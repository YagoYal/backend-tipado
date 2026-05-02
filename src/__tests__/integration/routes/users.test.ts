import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildTestApp, type TestApp } from '../../helpers/build-test-app'
import { db } from '../../../db'
import { usersTable } from '../../../db/schema'

let app: TestApp

const defaultUser = { name: 'Test User', email: 'test@example.com', password: 'password123' }

beforeAll(async () => {
  app = buildTestApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(async () => {
  await db.delete(usersTable)
})

async function createUser(data = defaultUser) {
  const res = await app.inject({ method: 'POST', url: '/users', body: data })
  return res.json() as { id: string; name: string; email: string; createdAt: string }
}

async function login(email = defaultUser.email, password = defaultUser.password) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    body: { email, password },
  })
  return res.json().token as string
}

// ─── POST /users ──────────────────────────────────────────────────────────────

describe('POST /users', () => {
  it('returns 201 with user data and no sensitive fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/users', body: defaultUser })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({ name: defaultUser.name, email: defaultUser.email })
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('createdAt')
    expect(body).not.toHaveProperty('passwordHash')
    expect(body).not.toHaveProperty('passwordChangedAt')
  })

  it('returns 400 when body fails validation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      body: { name: 'A', email: 'invalid-email', password: '123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 409 when email already exists', async () => {
    await createUser()
    const res = await app.inject({ method: 'POST', url: '/users', body: defaultUser })
    expect(res.statusCode).toBe(409)
  })
})

// ─── GET /users ───────────────────────────────────────────────────────────────

describe('GET /users', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/users' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 with a malformed token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: 'Bearer not.a.valid.token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 and an array of users without sensitive fields', async () => {
    await createUser()
    const token = await login()

    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(body[0]).not.toHaveProperty('passwordHash')
    expect(body[0]).not.toHaveProperty('passwordChangedAt')
  })

  it('respects ?limit pagination', async () => {
    await Promise.all([
      createUser({ name: 'User A', email: 'a@test.com', password: 'password123' }),
      createUser({ name: 'User B', email: 'b@test.com', password: 'password123' }),
      createUser({ name: 'User C', email: 'c@test.com', password: 'password123' }),
    ])
    const token = await login('a@test.com')

    const res = await app.inject({
      method: 'GET',
      url: '/users?page=1&limit=2',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(2)
  })

  it('returns second page correctly', async () => {
    await Promise.all([
      createUser({ name: 'User A', email: 'a@test.com', password: 'password123' }),
      createUser({ name: 'User B', email: 'b@test.com', password: 'password123' }),
      createUser({ name: 'User C', email: 'c@test.com', password: 'password123' }),
    ])
    const token = await login('a@test.com')

    const res = await app.inject({
      method: 'GET',
      url: '/users?page=2&limit=2',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })
})

// ─── PATCH /users/:id/password ────────────────────────────────────────────────

describe('PATCH /users/:id/password', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/users/some-id/password',
      body: { currentPassword: 'old', newPassword: 'newpassword' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 when trying to change another user password', async () => {
    await createUser()
    const token = await login()

    const res = await app.inject({
      method: 'PATCH',
      url: '/users/different-user-id/password',
      headers: { authorization: `Bearer ${token}` },
      body: { currentPassword: defaultUser.password, newPassword: 'newpassword123' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 409 when current password is wrong', async () => {
    const { id } = await createUser()
    const token = await login()

    const res = await app.inject({
      method: 'PATCH',
      url: `/users/${id}/password`,
      headers: { authorization: `Bearer ${token}` },
      body: { currentPassword: 'wrongpassword', newPassword: 'newpassword123' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('returns 204 on successful password change', async () => {
    const { id } = await createUser()
    const token = await login()

    const res = await app.inject({
      method: 'PATCH',
      url: `/users/${id}/password`,
      headers: { authorization: `Bearer ${token}` },
      body: { currentPassword: defaultUser.password, newPassword: 'newpassword123' },
    })
    expect(res.statusCode).toBe(204)
  })

  it('invalidates old token after password change', async () => {
    const { id } = await createUser()
    const oldToken = await login()

    await app.inject({
      method: 'PATCH',
      url: `/users/${id}/password`,
      headers: { authorization: `Bearer ${oldToken}` },
      body: { currentPassword: defaultUser.password, newPassword: 'newpassword123' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${oldToken}` },
    })
    expect(res.statusCode).toBe(401)
  })
})
