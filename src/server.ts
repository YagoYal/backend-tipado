import { buildApp } from './app'
import { env } from './config/env'

const app = buildApp()

app.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
  app.log.info(`HTTP Server running on port ${env.PORT}`)
})
