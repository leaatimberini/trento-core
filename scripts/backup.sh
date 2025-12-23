#!/bin/bash
# =============================================================================
# TRENTO CORE - Script de Backup
# Uso: ./scripts/backup.sh [tipo]
# Tipos: full | database | files | pre-deploy
# =============================================================================

set -e

TIPO=${1:-"full"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_NAME="trento_backup_${TIPO}_${TIMESTAMP}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}[Backup]${NC} Iniciando backup: $TIPO"

case $TIPO in
    "database"|"db")
        echo "Exportando base de datos..."
        docker exec trento_db_prod pg_dump -U postgres trento > "${BACKUP_DIR}/${BACKUP_NAME}.sql"
        gzip "${BACKUP_DIR}/${BACKUP_NAME}.sql"
        echo -e "${GREEN}✓${NC} Database backup: ${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"
        ;;
        
    "files")
        echo "Respaldando archivos..."
        tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_uploads.tar.gz" uploads/ 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Files backup: ${BACKUP_DIR}/${BACKUP_NAME}_uploads.tar.gz"
        ;;
        
    "full")
        echo "Ejecutando backup completo..."
        
        # Database
        docker exec trento_db_prod pg_dump -U postgres trento > "${BACKUP_DIR}/${BACKUP_NAME}.sql"
        
        # Uploads
        if [ -d "uploads" ]; then
            tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_uploads.tar.gz" uploads/
        fi
        
        # Config
        tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_config.tar.gz" config/ .env* 2>/dev/null || true
        
        # Combinar todo
        cd "$BACKUP_DIR"
        tar -czf "${BACKUP_NAME}.tar.gz" \
            "${BACKUP_NAME}.sql" \
            "${BACKUP_NAME}_uploads.tar.gz" 2>/dev/null || true \
            "${BACKUP_NAME}_config.tar.gz" 2>/dev/null || true
        
        # Limpiar archivos temporales
        rm -f "${BACKUP_NAME}.sql" "${BACKUP_NAME}_uploads.tar.gz" "${BACKUP_NAME}_config.tar.gz" 2>/dev/null || true
        cd ..
        
        echo -e "${GREEN}✓${NC} Full backup: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
        ;;
        
    "pre-deploy")
        echo "Backup pre-deploy (solo DB)..."
        docker exec trento_db_prod pg_dump -U postgres trento > "${BACKUP_DIR}/pre_deploy_${TIMESTAMP}.sql"
        gzip "${BACKUP_DIR}/pre_deploy_${TIMESTAMP}.sql"
        echo -e "${GREEN}✓${NC} Pre-deploy backup: ${BACKUP_DIR}/pre_deploy_${TIMESTAMP}.sql.gz"
        ;;
        
    *)
        echo -e "${RED}Tipo de backup no válido: $TIPO${NC}"
        echo "Uso: ./scripts/backup.sh [full|database|files|pre-deploy]"
        exit 1
        ;;
esac

# Limpiar backups antiguos (mantener últimos 7)
echo "Limpiando backups antiguos..."
cd "$BACKUP_DIR"
ls -t *.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -- 2>/dev/null || true
ls -t *.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -- 2>/dev/null || true
cd ..

echo -e "${GREEN}[Backup]${NC} Completado"

# Mostrar tamaño
du -h "${BACKUP_DIR}/${BACKUP_NAME}"* 2>/dev/null || true
