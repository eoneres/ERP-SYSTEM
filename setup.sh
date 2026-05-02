#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║         ERP System — GitHub Codespaces Setup Script         ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${BLUE}[ERP]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

ROOT="$(cd "$(dirname "$0")" && pwd)"
API="$ROOT/apps/api"
WEB="$ROOT/apps/web"

log "Iniciando setup em: $ROOT"

# ── Env files ─────────────────────────────────────────────────────────────────
if [ ! -f "$API/.env" ]; then
  cp "$API/env" "$API/.env" 2>/dev/null || cp "$API/.env.example" "$API/.env"
  ok "apps/api/.env criado"
fi

if [ ! -f "$WEB/.env.local" ]; then
  echo "NEXT_PUBLIC_DEMO_TENANT_ID=00000000-0000-4000-8000-000000000001" > "$WEB/.env.local"
  ok "apps/web/.env.local criado"
fi

# ── Instalar dependências ─────────────────────────────────────────────────────
log "Instalando dependências..."
cd "$ROOT" && npm install --legacy-peer-deps -s
ok "Dependências instaladas"

# ── Docker ────────────────────────────────────────────────────────────────────
log "Subindo serviços Docker..."
if command -v docker &>/dev/null; then
  docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || warn "Docker falhou"
  log "Aguardando PostgreSQL ficar pronto..."
  sleep 5
  ok "Docker services iniciados"
else
  warn "Docker não encontrado. Inicie PostgreSQL e Redis manualmente."
fi

# ── Seed do banco ─────────────────────────────────────────────────────────────
log "Rodando seed do banco de dados..."
cd "$API"
npx ts-node -r tsconfig-paths/register src/infrastructure/database/seed.ts || warn "Seed falhou — rode manualmente: cd apps/api && npx ts-node -r tsconfig-paths/register src/infrastructure/database/seed.ts"

# ── Resumo ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup concluído! 🎉                    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  ${BLUE}npm run dev${NC}        → inicia API + Frontend        ${GREEN}║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  🌐 Frontend  → http://localhost:3000                ${GREEN}║${NC}"
echo -e "${GREEN}║  🚀 API       → http://localhost:3001                ${GREEN}║${NC}"
echo -e "${GREEN}║  📖 Swagger   → http://localhost:3001/docs           ${GREEN}║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  👤 Login:    admin@demo.com / Admin@123             ${GREEN}║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
