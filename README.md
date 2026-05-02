# backend-tipado

REST API com Node.js, Fastify, TypeScript e PostgreSQL — construída com foco em boas práticas de segurança, arquitetura em camadas e pronta para deploy.

## Stack

- **Runtime:** Node.js 22
- **Framework:** Fastify 5
- **Linguagem:** TypeScript (strict)
- **ORM:** Drizzle ORM
- **Banco de dados:** PostgreSQL
- **Cache / Blacklist:** Redis (ioredis)
- **Validação:** Zod
- **Autenticação:** JWT + Refresh Tokens + bcryptjs
- **Documentação:** Swagger UI (`/docs`)

## Arquitetura

```
src/
├── config/         # Variáveis de ambiente validadas com Zod
├── db/             # Schema Drizzle + conexão PostgreSQL + cliente Redis
├── errors/         # Classes de erro customizadas (AppError, NotFoundError, ConflictError)
├── http/
│   ├── middlewares/ # Error handler, sanitização de input, audit log
│   └── routes/     # Rotas HTTP com schemas Zod (health, auth, users)
├── repositories/   # Queries ao banco (Drizzle)
├── services/       # Regras de negócio
├── migrate.ts      # Runner de migrations standalone
├── server.ts       # Inicialização da aplicação
└── types.ts        # Tipos globais e augmentações do Fastify
```

**Fluxo de uma requisição:** `Route → Service → Repository → DB`

## Segurança

- Rate limiting global (100 req/min) e específico em `/auth/login` (5 req/min)
- Headers HTTP de segurança via `@fastify/helmet` com CSP customizada
- Access token JWT de curta duração (15min) com `jti` único por emissão
- Refresh tokens rotativos — cada uso emite um novo e revoga o anterior
- Blacklist de access tokens revogados no Redis (TTL = tempo restante do token)
- JWT invalidado automaticamente após troca de senha (`pwdAt`)
- Senhas com hash bcrypt (salt rounds 10)
- Sanitização de HTML em todos os inputs antes da validação
- Queries parametrizadas via Drizzle (sem SQL injection)
- CORS restrito à origem configurada
- Audit log em todas as requisições (método, URL, IP, usuário, status, tempo)

## Pré-requisitos

- Node.js 22+
- PostgreSQL 16+
- Redis 7+

## Configuração

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Gerar JWT_SECRET forte (mínimo 64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Criar o banco de dados
createdb backend_tipado

# 5. Aplicar migrations
npm run db:migrate

# 6. Iniciar em desenvolvimento
npm run dev
```

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor com hot-reload |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run start` | Aplica migrations e inicia em produção |
| `npm run migrate` | Aplica migrations standalone |
| `npm run db:generate` | Gera nova migration a partir do schema |
| `npm run db:migrate` | Aplica migrations pendentes |
| `npm run db:studio` | UI visual do banco (Drizzle Studio) |
| `npm run lint` | Verifica erros de lint |
| `npm run lint:fix` | Corrige erros de lint automaticamente |
| `npm run format` | Formata o código com Prettier |
| `npm run test` | Roda todos os testes |
| `npm run test:unit` | Apenas testes unitários |
| `npm run test:integration` | Apenas testes de integração |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run test:db:setup` | Cria o banco de testes e aplica migrations |
| `npm run audit` | Verifica vulnerabilidades (nível high+) |

## Rotas

### Health
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | — | Status da aplicação |

### Auth
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/login` | — | Autenticar — retorna `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | — | Rotacionar refresh token — retorna novos tokens |
| POST | `/auth/logout` | JWT | Revogar sessão — blacklista access token e revoga refresh token |

### Users
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/users` | — | Criar usuário |
| GET | `/users` | JWT | Listar usuários (paginado) |
| PATCH | `/users/:id/password` | JWT (próprio) | Alterar senha |

**Parâmetros de paginação:** `?page=1&limit=20` (máx. 100)

**Header de autenticação:** `Authorization: Bearer <accessToken>`

A documentação completa e interativa está disponível em `http://localhost:3333/docs`.

## Deploy com Docker Compose

```bash
# 1. Configurar variáveis (obrigatórias: POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGIN)
cp .env.example .env

# 2. Subir todos os serviços (app + PostgreSQL + Redis)
docker compose up -d --build
```

O container aplica as migrations automaticamente antes de iniciar o servidor.

## Variáveis de Ambiente

Consulte [.env.example](.env.example) para a lista completa com descrições.
