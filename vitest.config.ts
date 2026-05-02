import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

// Load .env.test before workers spawn so they inherit the test env vars.
// dotenv/config inside env.ts won't override these since dotenv skips already-set vars.
config({ path: '.env.test', override: true })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Integration tests share a real database — parallel file execution causes
    // beforeEach db.delete() from one file to race with another file's queries.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/migrate.ts', 'src/server.ts', 'src/app.ts'],
    },
  },
})
