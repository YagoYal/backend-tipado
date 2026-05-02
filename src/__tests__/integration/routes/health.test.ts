import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, type TestApp } from '../../helpers/build-test-app'

let app: TestApp

beforeAll(async () => {
  app = buildTestApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('GET /health', () => {
  it('returns 200 with status ok and timestamp', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok' })
    expect(res.json()).toHaveProperty('timestamp')
  })
})
