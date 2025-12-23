#!/bin/bash
# =============================================================================
# TRENTO CORE - Script de Setup Inicial
# Ejecutar una sola vez al instalar el sistema
# Uso: ./scripts/setup.sh [nombre_empresa]
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMPRESA=${1:-"mi_empresa"}

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║               TRENTO CORE - SETUP INICIAL                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Configurando Trento Core para: ${EMPRESA}${NC}"
echo ""

# 1. Crear estructura de directorios
echo "1. Creando estructura de directorios..."
mkdir -p backups logs config uploads scripts

# 2. Copiar archivos de configuración
echo "2. Configurando archivos de entorno..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   ✓ Archivo .env creado"
else
    echo "   - Archivo .env ya existe"
fi

if [ ! -f ".env.production" ]; then
    cp .env.example .env.production
    echo "   ✓ Archivo .env.production creado"
else
    echo "   - Archivo .env.production ya existe"
fi

# 3. Generar JWT_SECRET si no existe
if ! grep -q "JWT_SECRET=" .env || grep -q "JWT_SECRET=$" .env; then
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
    echo "   ✓ JWT_SECRET generado"
fi

# 4. Crear configuración de empresa
echo "3. Creando configuración de empresa..."
CONFIG_FILE="config/${EMPRESA}.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" << EOF
# Configuración de ${EMPRESA}
# Generado: $(date)

empresa:
  nombre: "${EMPRESA}"
  razon_social: "Empresa SA"
  cuit: "30-12345678-9"
  direccion: "Calle Principal 123"
  ciudad: "Buenos Aires"
  provincia: "Buenos Aires"
  telefono: "+54 11 1234-5678"
  email: "info@empresa.com"

fiscal:
  punto_venta: 1
  tipo_factura: "A"
  ambiente: "testing"  # testing | production
  certificado: ""
  clave_fiscal: ""

branding:
  logo: "/uploads/logo.png"
  color_primario: "#1a73e8"
  color_secundario: "#34a853"

modulos:
  pos: true
  crm: true
  inventario: true
  logistica: true
  whatsapp: false
  blog: true
  ai: true

integraciones:
  mercadolibre: false
  tiendanube: false
  woocommerce: false
  rappi: false
EOF
    echo "   ✓ Configuración creada: $CONFIG_FILE"
else
    echo "   - Configuración ya existe: $CONFIG_FILE"
fi

# 5. Verificar Docker
echo "4. Verificando Docker..."
if command -v docker &> /dev/null; then
    echo "   ✓ Docker instalado: $(docker --version | cut -d' ' -f3)"
else
    echo -e "   ${RED}✗ Docker no está instalado${NC}"
    echo "   Instalar Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if command -v docker-compose &> /dev/null; then
    echo "   ✓ Docker Compose instalado"
else
    echo -e "   ${RED}✗ Docker Compose no está instalado${NC}"
    exit 1
fi

# 6. Construir imágenes
echo "5. Construyendo imágenes Docker (esto puede tomar varios minutos)..."
docker-compose build

# 7. Iniciar servicios
echo "6. Iniciando servicios..."
docker-compose up -d

# 8. Esperar y ejecutar migraciones
echo "7. Esperando a que la base de datos esté lista..."
sleep 15

echo "8. Ejecutando migraciones de base de datos..."
docker exec trento_api npx prisma db push --accept-data-loss

# 9. Crear usuario admin inicial
echo "9. Creando usuario administrador..."
# El usuario admin se crea automáticamente con el seed o primera ejecución

# Resumen
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   SETUP COMPLETADO                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Empresa: ${BLUE}${EMPRESA}${NC}"
echo -e "Config:  ${BLUE}config/${EMPRESA}.yaml${NC}"
echo ""
echo -e "Accede a la aplicación: ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}IMPORTANTE:${NC}"
echo "1. Editar config/${EMPRESA}.yaml con datos reales"
echo "2. Configurar certificados AFIP en .env"
echo "3. Cambiar contraseña de admin por defecto"
echo ""
