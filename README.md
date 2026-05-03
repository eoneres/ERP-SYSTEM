# ERP System

Sistema ERP modular, multi-tenant, construído com NestJS + Next.js 14.

## Stack

| Camada     | Tecnologia                        |
|------------|-----------------------------------|
| Backend    | NestJS 10, TypeORM, PostgreSQL 16 |
| Frontend   | Next.js 14, TypeScript, Tailwind  |
| Cache      | Redis 7                           |
| Email dev  | Mailpit (porta 8025)              |

## Início rápido

### 1. Pré-requisitos
```bash
node >= 20
docker + docker-compose
```

### 2. Subir infraestrutura
```bash
docker-compose up -d
# Aguardar containers ficarem healthy (~15s)
docker-compose ps
```

### 3. Instalar dependências
```bash
npm install
```

### 4. Popular banco de dados
```bash
cd apps/api && npm run db:seed
```

### 5. Iniciar em modo desenvolvimento
```bash
# Na raiz do projeto
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/v1/docs
- Mailpit:  http://localhost:8025

## Credenciais demo

| Usuário          | Senha        | Perfil       |
|------------------|--------------|--------------|
| admin@demo.com   | Admin@123    | Admin        |
| gerente@demo.com | Gerente@123  | Gerente      |

## Arquitetura de rede (Codespaces)

O frontend usa **URL relativa** `/api/v1/*`.  
O Next.js faz proxy interno para `http://localhost:3001`.  
O browser **nunca** chama a porta 3001 diretamente — sem problemas de CORS.

```
Browser  →  /api/v1/auth/login  →  Next.js :3000
                                        ↓ (proxy interno)
                              NestJS :3001/api/v1/auth/login
```

## Variáveis de ambiente

### apps/api/.env
Copiado automaticamente de `.env.example`.

### apps/web/.env.local
```
NEXT_PUBLIC_DEMO_TENANT_ID=00000000-0000-4000-8000-000000000001
BACKEND_INTERNAL_URL=http://localhost:3001
```

> **Não adicione** `NEXT_PUBLIC_API_URL` — causaria CORS no Codespaces.
