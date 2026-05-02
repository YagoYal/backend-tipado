import { config } from 'dotenv'
config({ path: '.env.test', override: true })

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

async function main() {
  const url = new URL(process.env.DATABASE_URL!)
  const dbName = url.pathname.slice(1)
  url.pathname = '/postgres'

  const adminClient = postgres(url.toString(), { max: 1 })
  try {
    await adminClient.unsafe(`CREATE DATABASE "${dbName}"`)
    console.log(`Database created: ${dbName}`)
  } catch (err: unknown) {
    const pg = err as { code?: string }
    if (pg.code === '42P04') {
      console.log(`Database already exists: ${dbName}`)
    } else {
      throw err
    }
  }
  await adminClient.end()

  const testClient = postgres(process.env.DATABASE_URL!, { max: 1 })
  await migrate(drizzle(testClient), { migrationsFolder: './drizzle' })
  await testClient.end()

  console.log('Test database ready.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
