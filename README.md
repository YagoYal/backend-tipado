# backend-tipado

REST API com Node.js, Fastify, TypeScript e PostgreSQL — construída com foco em boas práticas de segurança, arquitetura em camadas e pronta para deploy.

## Stack

- **Runtime:** Node.js 22
- **Framework:** Fastify 5
- **Linguagem:** TypeScript (strict)
- **ORM:** Drizzle ORM
- **Banco de dados:** PostgreSQL
- **Validação:** Zod
- **Autenticação:** JWT (`@fastify/jwt`) + bcryptjs
- **Documentação:** Swagger UI (`/docs`)

## Arquitetura

```
src/
├── config/         # Variáveis de ambiente validadas com Zod
├── db/             # Schema Drizzle + conexão PostgreSQL
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
- JWT com expiração configurável — invalidado automaticamente após troca de senha
- Senhas com hash bcrypt (salt rounds 10)
- Sanitização de HTML em todos os inputs antes da validação
- Queries parametrizadas via Drizzle (sem SQL injection)
- CORS restrito à origem configurada
- Audit log em todas as requisições (método, URL, IP, usuário, status, tempo)

## Pré-requisitos

- Node.js 22+
- PostgreSQL 16+

## Configuração

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Gerar JWT_SECRET forte
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
| `npm run audit` | Verifica vulnerabilidades (nível high+) |

## Rotas

### Health
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | — | Status da aplicação |

### Auth
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/login` | — | Autenticar e receber JWT |

### Users
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/users` | — | Criar usuário |
| GET | `/users` | JWT | Listar usuários (paginado) |
| PATCH | `/users/:id/password` | JWT (próprio) | Alterar senha |

**Parâmetros de paginação:** `?page=1&limit=20` (máx. 100)

**Header de autenticação:** `Authorization: Bearer <token>`

A documentação completa e interativa está disponível em `http://localhost:3333/docs`.

## Deploy com Docker

```bash
# Build da imagem
docker build -t backend-tipado .

# Rodar o container
docker run -p 3333:3333 --env-file .env backend-tipado
```

O container aplica as migrations automaticamente antes de iniciar o servidor.

## Variáveis de Ambiente

Consulte [.env.example](.env.example) para a lista completa com descrições.
