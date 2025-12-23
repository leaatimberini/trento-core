#!/bin/bash
# =============================================================================
# TRENTO CORE - Script de Restauración
# Uso: ./scripts/restore.sh <archivo_backup>
# Ejemplo: ./scripts/restore.sh backups/trento_backup_full_20241217.tar.gz
# =============================================================================

set -e

BACKUP_FILE=$1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Debe especificar el archivo de backup${NC}"
    echo "Uso: ./scripts/restore.sh <archivo_backup>"
    echo ""
    echo "Backups disponibles:"
    ls -la backups/*.tar.gz backups/*.sql.gz 2>/dev/null || echo "No hay backups"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Archivo no encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  ADVERTENCIA: Esto sobrescribirá los datos actuales${NC}"
read -p "¿Continuar? (s/N): " confirm
if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Operación cancelada"
    exit 0
fi

TEMP_DIR=$(mktemp -d)
echo -e "${GREEN}[Restore]${NC} Iniciando restauración desde: $BACKUP_FILE"

# Determinar tipo de backup
if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    echo "Restaurando base de datos..."
    gunzip -c "$BACKUP_FILE" | docker exec -i trento_db_prod psql -U postgres -d trento
    echo -e "${GREEN}✓${NC} Base de datos restaurada"
    
elif [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    echo "Extrayendo backup..."
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    
    # Restaurar DB si existe
    if ls "$TEMP_DIR"/*.sql 1>/dev/null 2>&1; then
        echo "Restaurando base de datos..."
        cat "$TEMP_DIR"/*.sql | docker exec -i trento_db_prod psql -U postgres -d trento
        echo -e "${GREEN}✓${NC} Base de datos restaurada"
    fi
    
    # Restaurar uploads si existe
    if [ -f "$TEMP_DIR"/*_uploads.tar.gz ]; then
        echo "Restaurando uploads..."
        tar -xzf "$TEMP_DIR"/*_uploads.tar.gz -C .
        echo -e "${GREEN}✓${NC} Uploads restaurados"
    fi
    
    # Restaurar config si existe
    if [ -f "$TEMP_DIR"/*_config.tar.gz ]; then
        echo "Restaurando configuración..."
        tar -xzf "$TEMP_DIR"/*_config.tar.gz -C .
        echo -e "${GREEN}✓${NC} Configuración restaurada"
    fi
fi

# Limpiar
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                RESTAURACIÓN COMPLETADA                        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}IMPORTANTE: Reiniciar los servicios para aplicar cambios${NC}"
echo "Ejecutar: docker-compose -f docker-compose.prod.yml restart"
