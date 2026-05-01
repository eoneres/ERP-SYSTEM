#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║         ERP System — GitHub Codespaces Setup Script         ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[ERP]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

PROJECT_ROOT="/workspaces/ERP-SYSTEM"

log "Starting ERP System setup..."
echo ""

# ─── 1. Node version check ────────────────────────────────────────────────────
log "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  warn "Node.js 20+ recommended (found v${NODE_VERSION}). Upgrading..."
  nvm install 20 && nvm use 20 || warn "nvm not available, continuing with current version"
fi
ok "Node.js $(node -v) ✓"

# ─── 2. Copy env files ────────────────────────────────────────────────────────
log "Setting up environment files..."

if [ ! -f "$PROJECT_ROOT/apps/api/.env" ]; then
  cp "$PROJECT_ROOT/apps/api/.env.example" "$PROJECT_ROOT/apps/api/.env"
  ok "Created apps/api/.env"
fi

if [ ! -f "$PROJECT_ROOT/apps/web/.env.local" ]; then
  cp "$PROJECT_ROOT/apps/web/.env.example" "$PROJECT_ROOT/apps/web/.env.local"
  ok "Created apps/web/.env.local"
fi

# ─── 3. Install dependencies ─────────────────────────────────────────────────
log "Installing root dependencies..."
cd "$PROJECT_ROOT"
npm install --legacy-peer-deps
ok "Root dependencies installed ✓"

log "Installing API dependencies..."
cd "$PROJECT_ROOT/apps/api"
npm install --legacy-peer-deps
ok "API dependencies installed ✓"

log "Installing Web dependencies..."
cd "$PROJECT_ROOT/apps/web"
npm install --legacy-peer-deps
ok "Web dependencies installed ✓"

# ─── 4. Docker services ───────────────────────────────────────────────────────
cd "$PROJECT_ROOT"
log "Starting Docker services (PostgreSQL, Redis, RabbitMQ)..."

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
  docker-compose up -d --wait 2>/dev/null || docker compose up -d 2>/dev/null || warn "Docker Compose failed — services may need manual setup"
  ok "Docker services started ✓"
  echo ""
  echo "   📦 PostgreSQL → localhost:5432"
  echo "   🔴 Redis      → localhost:6379"
  echo "   🐰 RabbitMQ   → localhost:5672 (UI: http://localhost:15672)"
  echo "   📧 MailHog    → localhost:1025 (UI: http://localhost:8025)"
else
  warn "Docker not found. Start services manually or use external DBs."
fi

# ─── 5. Summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup concluído com sucesso! 🎉             ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Para iniciar o desenvolvimento:                         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BLUE}npm run dev${NC}                (API + Web juntos)           ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BLUE}npm run dev:api${NC}            (somente API)               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BLUE}npm run dev:web${NC}            (somente Web)               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  🌐 Frontend → http://localhost:3000                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  🚀 API      → http://localhost:3001                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  📖 Swagger  → http://localhost:3001/docs                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                          ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
