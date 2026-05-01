#!/bin/bash
# =============================================================================
# CORREÇÃO DOS 6 ERROS TypeScript - ERP System
# Execute em: /workspaces/ERP-SYSTEM
# =============================================================================
# Resumo dos problemas:
#   1. auth.service.ts:70   — TypeORM rejeita `null` direto em update(); usar () => 'NULL'
#   2. auth.service.ts:132  — mesma causa: refreshTokenHash: null
#   3. finance.service.ts:7 — @nestjs/cache-manager v2+ exporta CACHE_MANAGER, não InjectCache
#   4. finance.service.ts:129 — dueDate é string no DTO mas Date na entidade
#   5. finance.service.ts:162 — mesma causa no updateTransaction
#   6. tenant.entity.ts:54  — TenantPlan.TRIAL não existe; o valor TRIAL está em TenantStatus
# =============================================================================

set -e
cd /workspaces/ERP-SYSTEM/apps/api

echo "🔧 Aplicando correções..."

# =============================================================================
# ERRO 1 e 2 — auth.service.ts
# TypeORM v0.3+ não aceita `null` literal em update() para campos opcionais.
# Solução: usar () => 'NULL' (expressão SQL) ou undefined com QueryBuilder.
# A forma mais simples e compatível é trocar null por undefined nos campos
# opcionais e usar uma expressão SQL apenas onde é realmente necessário.
# =============================================================================

# Localiza o arquivo
AUTH_SERVICE="src/modules/auth/auth.service.ts"

# Correção 1: lockedUntil: null  →  lockedUntil: undefined as unknown as Date
# (TypeORM interpreta undefined como "não altere", então usamos a expressão SQL)
# Melhor abordagem: usar uma query builder ou passar () => 'NULL'

# Patch usando sed - substitui o bloco do update de login bem-sucedido
python3 - << 'PYEOF'
import re

path = "src/modules/auth/auth.service.ts"
with open(path, "r") as f:
    content = f.read()

# CORREÇÃO 1: No update do login bem-sucedido, lockedUntil: null não compila
# Trocamos por uma expressão que o TypeORM aceita para NULL em colunas nullable
old = "      lockedUntil: null,"
new = "      lockedUntil: () => 'NULL',"
content = content.replace(old, new, 1)

# CORREÇÃO 2: No logout, refreshTokenHash: null não compila
old = "    await this.userRepository.update(userId, { refreshTokenHash: null });"
new = "    await this.userRepository.update(userId, { refreshTokenHash: () => 'NULL' });"
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)

print("✅ auth.service.ts corrigido")
PYEOF

# =============================================================================
# ERRO 3 — finance.service.ts: InjectCache não existe em @nestjs/cache-manager v2+
# @nestjs/cache-manager >= 2.0 exporta CACHE_MANAGER token (string),
# e o inject é feito via @Inject(CACHE_MANAGER).
# =============================================================================

FINANCE_SERVICE="src/modules/finance/services/finance.service.ts"

python3 - << 'PYEOF'
path = "src/modules/finance/services/finance.service.ts"
with open(path, "r") as f:
    content = f.read()

# Troca o import
content = content.replace(
    "import { InjectCache } from '@nestjs/cache-manager';",
    "import { CACHE_MANAGER } from '@nestjs/cache-manager';\nimport { Inject } from '@nestjs/common';"
)

# Troca o decorator no construtor
content = content.replace(
    "@InjectCache() private readonly cache: Cache,",
    "@Inject(CACHE_MANAGER) private readonly cache: Cache,"
)

# Garante que @nestjs/common não seja importado duas vezes
# (o arquivo já tem import de @nestjs/common, então mesclamos)
lines = content.split('\n')
new_lines = []
common_import_line = None
inject_added = False

for i, line in enumerate(lines):
    # Detecta a linha extra de Inject que adicionamos se já houver import de common
    if line.strip() == "import { Inject } from '@nestjs/common';":
        inject_added = True
        # Não adiciona agora, vai mesclar no import existente
        continue
    if line.startswith("import {") and "@nestjs/common" in line and not inject_added:
        # Já tem import de common: adiciona Inject se não tiver
        if "Inject" not in line:
            line = line.replace("import {", "import { Inject,", 1)
        inject_added = True
    new_lines.append(line)

content = '\n'.join(new_lines)

with open(path, "w") as f:
    f.write(content)

print("✅ finance.service.ts — InjectCache corrigido")
PYEOF

# =============================================================================
# ERROS 4 e 5 — finance.service.ts: dueDate string → Date
# O DTO usa @IsDateString() (string ISO), mas a entidade espera Date.
# Correção: converter no service antes de criar/merge.
# =============================================================================

python3 - << 'PYEOF'
path = "src/modules/finance/services/finance.service.ts"
with open(path, "r") as f:
    content = f.read()

# CORREÇÃO 4 — createTransaction: espalhar dto diretamente causa conflito de tipo
# Substituímos o spread por uma construção explícita que converte as datas
old_create = """    const tx = this.transactionRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: dto.status ?? TransactionStatus.PENDING,
    });"""

new_create = """    const tx = this.transactionRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      status: dto.status ?? TransactionStatus.PENDING,
      dueDate: new Date(dto.dueDate),
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
    });"""

content = content.replace(old_create, new_create, 1)

# CORREÇÃO 5 — updateTransaction: mesmo problema ao dar merge com dto
old_merge = "    this.transactionRepo.merge(tx, { ...dto, updatedBy: userId });"
new_merge = """    this.transactionRepo.merge(tx, {
      ...dto,
      updatedBy: userId,
      ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
      ...(dto.paymentDate && { paymentDate: new Date(dto.paymentDate) }),
    });"""

content = content.replace(old_merge, new_merge, 1)

with open(path, "w") as f:
    f.write(content)

print("✅ finance.service.ts — conversão de datas corrigida")
PYEOF

# =============================================================================
# ERRO 6 — tenant.entity.ts: TenantPlan.TRIAL não existe
# O enum TenantPlan só tem: FREE, STARTER, PROFESSIONAL, ENTERPRISE.
# O valor TRIAL existe em TenantStatus. O default da coluna `plan` deve usar
# TenantPlan.FREE (plano padrão para novos tenants em trial).
# =============================================================================

python3 - << 'PYEOF'
path = "src/modules/tenants/entities/tenant.entity.ts"
with open(path, "r") as f:
    content = f.read()

# TenantPlan.TRIAL → TenantPlan.FREE (o status TRIAL já é controlado por TenantStatus)
content = content.replace(
    "default: TenantPlan.TRIAL,",
    "default: TenantPlan.FREE,"
)

with open(path, "w") as f:
    f.write(content)

print("✅ tenant.entity.ts — TenantPlan.TRIAL → TenantPlan.FREE corrigido")
PYEOF

echo ""
echo "✅ Todas as correções aplicadas. Verificando resultado..."
echo ""

# Confirma que os erros foram sanados (dry-run do tsc)
if command -v npx &> /dev/null; then
  npx tsc --noEmit 2>&1 | grep -E "error TS|Found [0-9]+ error" || echo "✅ Sem erros TypeScript detectados"
fi

echo ""
echo "📋 Resumo das correções:"
echo "  [1] auth.service.ts:70   — lockedUntil: null → () => 'NULL' (expressão SQL TypeORM)"
echo "  [2] auth.service.ts:132  — refreshTokenHash: null → () => 'NULL'"
echo "  [3] finance.service.ts:7 — InjectCache → @Inject(CACHE_MANAGER) do @nestjs/cache-manager v2+"
echo "  [4] finance.service.ts:129 — dueDate/paymentDate: new Date(dto.xxx) no create"
echo "  [5] finance.service.ts:162 — dueDate/paymentDate: new Date(dto.xxx) no merge"
echo "  [6] tenant.entity.ts:54  — TenantPlan.TRIAL → TenantPlan.FREE"
