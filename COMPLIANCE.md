# 📋 Cumplimiento y Preparación ISO

**Estándares Aplicables:** ISO 27001 (Seguridad de la Información), ISO 9001 (Gestión de Calidad).

---

## 1. Control de Acceso (ISO 27001 A.9)

### Política
El acceso a *Trento Core* se otorga bajo estricta necesidad de conocimiento (Need-to-Know).

- **Registro de Usuarios:** Realizado solo por Administradores.
- **Política de Contraseñas:** Mínimo 8 caracteres, hasheadas (Bcrypt).
- **Gestión de Sesiones:** JWT con expiración definida (7 días).
- **Revocación:** Capacidad de borrado lógico inmediato (estado `isActive: false`).

### Implementación
- Código: `AuthModule` / `JwtStrategy`.
- Auditoría: La tabla `AuditLog` rastrea todos los intentos de login y fallos de permisos.

---

## 2. Seguridad de Operaciones (ISO 27001 A.12)

### Estrategia de Respaldo (A.12.3)
- **Frecuencia:** Backup completo diario (03:00 AM).
- **Retención:** 30 días rotativos.
- **Encriptación:** En reposo (encriptación de volumen) y en tránsito.
- **Pruebas:** Procedimiento de restauración probado trimestralmente.

### Logging y Monitoreo (A.12.4)
- **Registro de Eventos:** Todos los errores del sistema y eventos de seguridad son registrados.
- **Protección:** Los logs se almacenan en un volumen restringido (`logs_data`).
- **Sincronización de Reloj:** Todos los contenedores sincronizan con el NTP del host.

---

## 3. Desarrollo y Mantenimiento del Sistema (ISO 27001 A.14)

### Gestión de Cambios
- **Control de Versiones:** Git Flow. La rama Main está protegida.
- **Revisión de Código:** Todos los PRs requieren al menos 1 aprobación senior.
- **Separación de Entornos:**
    - `Desarrollo`: Local/Staging.
    - `Producción`: Entorno aislado con credenciales distintas.

---

## 4. Gestión de Calidad (ISO 9001)

### Trazabilidad
Cada transacción financiera (`Sale`, `Payment`) es trazable a:
1.  **Usuario:** Quién la realizó.
2.  **Tiempo:** Marca de tiempo exacta.
3.  **Origen:** POS o Web.

### Gestión de Incidentes
- **Niveles de Severidad:**
    - **Sev1 (Crítico):** Sistema Caído. Respuesta < 1h.
    - **Sev2 (Mayor):** Falla de Consignación B2B. Respuesta < 4h.
    - **Sev3 (Menor):** Glitch de UI. Siguiente Día Hábil.

---

## 5. Continuidad del Negocio (Recuperación ante Desastres)

**RTO (Tiempo Objetivo de Recuperación):** 4 Horas.
**RPO (Punto Objetivo de Recuperación):** 24 Horas (Último Backup).

### Protocolo de Emergencia
1.  Aislar contenedores comprometidos.
2.  Aprovisionar nuevo host.
3.  Pull de artefactos desde el registro de contenedores.
4.  Restaurar Base de Datos desde almacenamiento en frío.
5.  Verificar integridad de `Inventory` antes de abrir tráfico.
