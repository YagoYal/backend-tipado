import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildTestApp, type TestApp } from '../../helpers/build-test-app'
import { db } from '../../../db'
import { usersTable } from '../../../db/schema'

let app: TestApp

const user = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
}

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

async function createUser() {
  return app.inject({ method: 'POST', url: '/users', body: user })
}

async function login() {
  await createUser()
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    body: { email: user.email, password: user.password },
  })
  return res.json<{ accessToken: string; refreshToken: string }>()
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns 200 with accessToken and refreshToken on valid credentials', async () => {
    await createUser()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: user.email, password: user.password },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.accessToken).toBe('string')
    expect(typeof body.refreshToken).toBe('string')
  })

  it('returns 400 when body fails Zod validation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: 'not-an-email', password: 'password123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when email does not exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: 'nobody@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 409 when password is wrong', async () => {
    await createUser()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: user.email, password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(409)
  })
})

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('returns 200 with new accessToken and refreshToken on valid refresh token', async () => {
    const { refreshToken } = await login()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      body: { refreshToken },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.accessToken).toBe('string')
    expect(typeof body.refreshToken).toBe('string')
  })

  it('returns tokens different from the originals after rotation', async () => {
    const original = await login()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      body: { refreshToken: original.refreshToken },
    })

    const rotated = res.json<{ accessToken: string; refreshToken: string }>()
    expect(rotated.accessToken).not.toBe(original.accessToken)
    expect(rotated.refreshToken).not.toBe(original.refreshToken)
  })

  it('returns 401 when refresh token is reused after rotation', async () => {
    const { refreshToken } = await login()

    await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      body: { refreshToken },
    })

    const reuse = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      body: { refreshToken },
    })

    expect(reuse.statusCode).toBe(401)
  })

  it('returns 401 for an invalid refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      body: { refreshToken: 'not-a-valid-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when body is missing refreshToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      body: {},
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─── POST /auth/logout ────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('returns 204 on valid session', async () => {
    const { accessToken, refreshToken } = await login()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
      body: { refreshToken },
    })

    expect(res.statusCode).toBe(204)
  })

  it('blacklists the access token so it cannot be used after logout', async () => {
    const { accessToken, refreshToken } = await login()

    await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
      body: { refreshToken },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(res.statusCode).toBe(401)
  })

  it('revokes the refresh token so it cannot be used after logout', async () => {
    const { accessToken, refreshToken } = await login()

    await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
      body: { refreshToken },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      body: { refreshToken },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 without authorization header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      body: { refreshToken: 'any-token' },
    })
    expect(res.statusCode).toBe(401)
  })
})
