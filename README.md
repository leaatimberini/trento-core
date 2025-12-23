# 🏰 Trento Core - Sistema de Planificación de Recursos Empresariales

**Versión:** 2.0.0-beta
**Estado:** Producción / Desarrollo Activo
**Stack Tecnológico:** Node.js (NestJS) | React (Next.js) | PostgreSQL | Redis | Docker | Gemini AI

---

## 🚀 Visión General

**Trento Core** es una plataforma de gestión unificada e inteligente diseñada para distribuidores de bebidas de alto volumen. Integra verticales críticas en un único monolito modular:

*   **ERP:** Finanzas, Compras, Stock e Inventario.
*   **POS (Punto de Venta):** Ventas de mostrador con control de turnos de caja.
*   **CRM:** Gestión de perfiles de clientes, cuentas corrientes B2B y límites de crédito.
*   **Ecommerce:** API integrada para canales de venta digital.
*   **IA (Cortex):** Asistente basado en LLM para consultas de stock en lenguaje natural y detección de anomalías.

> [!NOTE]
> Para detalles técnicos profundos, decisiones arquitectónicas y modelos de dominio, por favor consulte [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🛠️ Inicio Rápido (Desarrollo Local)

### Prerrequisitos
- Docker y Docker Compose
- Node.js 20+ (opcional, para scripts locales)

### Ejecutar el Proyecto

1.  **Clonar y Configurar:**
    ```bash
    cp .env.example .env
    # Editar .env con credenciales locales o solicitar al equipo
    ```

2.  **Iniciar Servicios:**
    ```bash
    docker-compose up -d
    ```
    - Frontend: http://localhost:3000
    - Backend API: http://localhost:3000/api
    - DB: localhost:5432

3.  **Logs:**
    ```bash
    docker-compose logs -f backend
    ```

---

## 🏭 Operación en Producción

### Despliegue (Deploy)
Utilice el script de despliegue seguro para garantizar cero tiempo de inactividad (donde sea posible) y builds correctos.

```bash
./deploy.sh
```

### Restauración de Emergencia (Restore)
En caso de falla catastrófica, restaure el último backup de la base de datos.

```bash
# Verificar que existan backups
ls -l ./backups

# Restaurar (Requiere detener el contenedor DB primero)
docker-compose stop postgres
docker run --rm -v $(pwd):/app -v postgres_data:/var/lib/postgresql/data postgres:16-alpine \
  sh -c "psql -U trento_user -d trento_core < /app/backups/latest.sql"
docker-compose start postgres
```

### Scripts Clave
- `scripts/setup.sh`: Configuración inicial del entorno.
- `deploy.sh`: Orquestador de despliegue en producción.

---

## 🛡️ Seguridad Operativa

- **Autenticación:** Auth stateless basada en JWT.
- **RBAC:** Control de Acceso Basado en Roles estricto (Admin, Seller, Stock, Audience).
- **Rate Limiting:** Política de limitación global habilitada para prevenir abusos.
- **Controles Financieros:**
    - Las ventas verifican disponibilidad de stock atómicamente.
    - El stock negativo está bloqueado por configuraciones predeterminadas.
    - Los turnos de caja deben conciliarse antes del cierre.

---

## 📊 Observabilidad

- **Logs:** Logs JSON centralizados desde el backend.
- **Health:** Chequeos de estado disponibles en `/api/health`.
- **Auditoría:** Todas las operaciones de escritura sensibles se registran en la tabla `AuditLog`.

---

*Para documentación arquitectónica detallada, ver [ARCHITECTURE.md](./ARCHITECTURE.md).*
