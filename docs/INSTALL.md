# Guía de Instalación - Trento Core

## Requisitos Previos

### Hardware Mínimo
- CPU: 2 cores
- RAM: 4 GB
- Disco: 20 GB SSD

### Hardware Recomendado (Producción)
- CPU: 4+ cores
- RAM: 8+ GB
- Disco: 50+ GB SSD

### Software
- Ubuntu 20.04+ / Debian 11+ (o compatible)
- Docker 20.10+
- Docker Compose 2.0+
- Git

## Instalación Paso a Paso

### 1. Instalar Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar
```

### 2. Clonar Repositorio

```bash
git clone https://github.com/tu-org/trento_core.git
cd trento_core
```

### 3. Ejecutar Setup Inicial

```bash
# Dar permisos a scripts
chmod +x deploy.sh scripts/*.sh

# Ejecutar setup (reemplazar mi_empresa con nombre real)
./scripts/setup.sh mi_empresa
```

El script setup:
- Crea estructura de directorios
- Genera archivo .env
- Crea configuración de empresa
- Construye imágenes Docker
- Inicia servicios
- Ejecuta migraciones

### 4. Configurar Empresa

Editar `config/mi_empresa.yaml`:

```yaml
empresa:
  nombre: "Mi Distribuidora"
  razon_social: "Mi Distribuidora SA"
  cuit: "30-12345678-9"
  # ... completar todos los campos
```

### 5. Configurar Variables de Entorno

Editar `.env`:

```bash
# OBLIGATORIO: Cambiar estos valores
JWT_SECRET=tu_clave_secreta_muy_larga_32_caracteres
POSTGRES_PASSWORD=password_seguro

# AFIP (para facturación)
AFIP_CUIT=30123456789
AFIP_ENVIRONMENT=testing
```

### 6. Reiniciar Servicios

```bash
docker-compose down
docker-compose up -d
```

### 7. Verificar Instalación

```bash
# Ver servicios corriendo
docker-compose ps

# Ver logs
docker logs -f trento_api

# Verificar health
curl http://localhost:3000/health
```

## Instalación en Producción

### 1. Preparar Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas
sudo apt install -y curl git wget htop
```

### 2. Configurar Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. Instalar SSL (Certbot)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d tu-dominio.com
```

### 4. Deploy Producción

```bash
# Copiar .env a producción
cp .env .env.production

# Editar configuración de producción
nano .env.production
# Cambiar: NODE_ENV=production

# Deploy
./deploy.sh mi_empresa production
```

### 5. Configurar Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6. Configurar Backups Automáticos

```bash
# Agregar a crontab
crontab -e

# Backup diario a las 3 AM
0 3 * * * /home/user/trento_core/scripts/backup.sh full >> /var/log/trento_backup.log 2>&1
```

## Actualización

```bash
cd trento_core

# Backup antes de actualizar
./scripts/backup.sh full

# Pull cambios
git pull origin main

# Re-deploy
./deploy.sh mi_empresa production
```

## Solución de Problemas

### Error de conexión a PostgreSQL
```bash
docker logs trento_db_prod
# Verificar que el container esté corriendo
docker-compose ps
```

### Error de migraciones
```bash
docker exec trento_api_prod npx prisma db push --force-reset
# CUIDADO: Esto borra datos
```

### Reiniciar todo
```bash
docker-compose down -v
docker-compose up -d
```

### Ver logs detallados
```bash
docker logs -f trento_api_prod 2>&1 | grep -i error
```

## Contacto Soporte

- Email: soporte@trento.com
- Tel: +54 11 XXXX-XXXX
