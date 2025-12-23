#!/bin/bash
# =============================================================================
# TRENTO CORE - Script de Deploy Principal
# Uso: ./deploy.sh [empresa] [ambiente]
# Ejemplo: ./deploy.sh miempresa production
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
EMPRESA=${1:-"trento"}
AMBIENTE=${2:-"production"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy_${TIMESTAMP}.log"

# Funciones
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    TRENTO CORE DEPLOY                        ║"
echo "║         ERP/POS/CRM para Distribuidoras de Bebidas          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Crear directorios necesarios
mkdir -p "$BACKUP_DIR" logs

log "Iniciando deploy para: $EMPRESA ($AMBIENTE)"

# 1. Verificar prerequisitos
log "Verificando prerequisitos..."
command -v docker >/dev/null 2>&1 || error "Docker no está instalado"
command -v docker-compose >/dev/null 2>&1 || error "Docker Compose no está instalado"
info "✓ Docker y Docker Compose disponibles"

# 2. Verificar archivo de configuración
CONFIG_FILE="./config/${EMPRESA}.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    warn "Archivo de configuración no encontrado: $CONFIG_FILE"
    warn "Usando configuración por defecto"
    CONFIG_FILE="./config/default.yaml"
fi

# 3. Cargar variables de entorno
ENV_FILE=".env.${AMBIENTE}"
if [ -f "$ENV_FILE" ]; then
    log "Cargando variables de entorno desde $ENV_FILE"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    warn "Archivo $ENV_FILE no encontrado, usando .env"
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
fi

# 4. Backup antes de deploy (solo en producción)
if [ "$AMBIENTE" = "production" ]; then
    log "Creando backup pre-deploy..."
    ./scripts/backup.sh pre-deploy || warn "Backup falló, continuando..."
fi

# 5. Pull de imágenes o build local
if [ "$AMBIENTE" = "production" ]; then
    log "Construyendo imágenes de producción..."
    docker-compose -f docker-compose.prod.yml build --no-cache
else
    log "Construyendo imágenes de desarrollo..."
    docker-compose build
fi

# 6. Detener servicios existentes
log "Deteniendo servicios existentes..."
if [ "$AMBIENTE" = "production" ]; then
    docker-compose -f docker-compose.prod.yml down --remove-orphans || true
else
    docker-compose down --remove-orphans || true
fi

# 7. Iniciar nuevos servicios
log "Iniciando servicios..."
if [ "$AMBIENTE" = "production" ]; then
    docker-compose -f docker-compose.prod.yml up -d
else
    docker-compose up -d
fi

# 8. Esperar a que los servicios estén listos
log "Esperando a que los servicios estén listos..."
sleep 10

# 9. Ejecutar migraciones de base de datos
log "Ejecutando migraciones de base de datos..."
if [ "$AMBIENTE" = "production" ]; then
    docker exec trento_api_prod npx prisma db push --accept-data-loss
else
    docker exec trento_api npx prisma db push --accept-data-loss
fi

# 10. Verificar estado de servicios
log "Verificando estado de servicios..."
if [ "$AMBIENTE" = "production" ]; then
    docker-compose -f docker-compose.prod.yml ps
else
    docker-compose ps
fi

# 11. Health check
log "Ejecutando health check..."
sleep 5
HEALTH_URL="http://localhost:3000/health/live"
if curl -s "$HEALTH_URL" | grep -q "ok"; then
    info "✓ Backend está saludable"
else
    warn "Health check falló, verificar logs"
fi

# Resumen
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   DEPLOY COMPLETADO                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
log "Deploy completado exitosamente para: $EMPRESA"
log "Ambiente: $AMBIENTE"
log "Timestamp: $TIMESTAMP"
log "Log: $LOG_FILE"
echo ""
echo -e "Accede a la aplicación en: ${BLUE}http://localhost:3000${NC}"
echo ""
