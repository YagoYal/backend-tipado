import { buildApp } from '../../app'

export function buildTestApp() {
  return buildApp({ logger: false })
}

export type TestApp = ReturnType<typeof buildTestApp>
