# Trento Core - Checklist Pre-Go-Live

## 🔴 CRÍTICO - Antes de Producción

### Seguridad
- [ ] Cambiar todas las contraseñas por defecto
- [ ] Generar nuevo JWT_SECRET (mínimo 32 caracteres)
- [ ] Configurar HTTPS/SSL
- [ ] Revisar CORS_ORIGIN para producción
- [ ] Deshabilitar debug mode (NODE_ENV=production)

### Base de Datos
- [ ] Backup de base de datos existente
- [ ] Configurar backups automáticos (cron)
- [ ] Verificar conexión a PostgreSQL
- [ ] Ejecutar migraciones: `npx prisma db push`

### AFIP (Facturación)
- [ ] Obtener certificado digital de AFIP
- [ ] Configurar CUIT correcto
- [ ] Probar en ambiente testing primero
- [ ] Validar punto de venta habilitado
- [ ] Verificar tipos de factura autorizados

---

## 🟡 IMPORTANTE - Configuración

### Empresa
- [ ] Completar datos de empresa en config/empresa.yaml
- [ ] Subir logo de empresa
- [ ] Configurar colores de branding
- [ ] Verificar razón social y CUIT

### Módulos
- [ ] Habilitar/deshabilitar módulos según necesidad
- [ ] Configurar WhatsApp si se usa
- [ ] Configurar integraciones e-commerce si aplica

### Usuarios
- [ ] Crear usuarios administradores
- [ ] Asignar roles correctamente
- [ ] Configurar permisos por módulo

---

## 🟢 RECOMENDADO - Optimización

### Rendimiento
- [ ] Configurar Redis para caché
- [ ] Revisar límites de rate limiting
- [ ] Optimizar imágenes de productos

### Monitoring
- [ ] Verificar health check funcionando
- [ ] Configurar alertas de errores
- [ ] Revisar logs periódicamente

### Datos Iniciales
- [ ] Importar productos existentes
- [ ] Importar clientes existentes
- [ ] Configurar zonas de delivery
- [ ] Crear categorías de productos

---

## ✅ VERIFICACIÓN FINAL

### Tests
- [ ] Crear una venta de prueba
- [ ] Verificar generación de factura
- [ ] Probar flow completo de pedido
- [ ] Verificar notificaciones email/WhatsApp

### Backup & Recovery
- [ ] Ejecutar backup manual: `./scripts/backup.sh full`
- [ ] Probar restauración: `./scripts/restore.sh`
- [ ] Verificar cron de backups configurado

### Go-Live
- [ ] DNS apuntando al servidor
- [ ] Certificado SSL instalado
- [ ] Monitoreo configurado
- [ ] Plan de rollback documentado

---

## 📝 NOTAS

Fecha verificación: _______________

Verificado por: _______________

Observaciones:
