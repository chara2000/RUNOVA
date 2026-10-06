# AUDITORÍA DE SINCRONIZACIÓN Y FLUJO DE DATOS — RUNOVA

**Fecha de Auditoría:** 06 de Octubre de 2026  
**Objetivo:** Validar si los datos fluyen bidireccionalmente y mantienen una única fuente de verdad entre **Web**, **Mobile**, **Connect (Smartwatch)**, **Backend** y **Base de Datos**.

---

## 1. EVALUACIÓN DEL FLUJO BIDIRECCIONAL

El estándar de oro exigido es:
```text
              DATABASE (Supabase)
               [FUENTE DE VERDAD]
                   ↗       ↖
               WEB          MOBILE
                             ↕
                           CONNECT
```

### Diagnóstico de Simetría Actual:
* **Entidad `devices` / `device_assignments`:** ✅ **SINCRONIZADO REAL**. Modificaciones hechas en Web o Mobile persisten en Supabase y se reflejan en la otra plataforma.
* **Entidad `workouts` / `workout_assignments`:** 🟡 **UNIDIRECCIONAL PARCIAL**. Creados y asignados en Web; almacenados en Base de Datos. Llegada a Connect mediante payload agnóstico; Mobile aún los tiene quemados en JSX.
* **Entidad `activities`:** 🟡 **DESCONECTADO EN CLIENTES LIVE**. La bandeja de entrada y el importador persisten a BD; sin embargo, las sesiones corridas en el Live Cockpit Web y Mobile no generan llamada a la BD. La sincronización de Connect Watch tiene un fallo de nombre de columna (`avg_hr` en lugar de `avg_heart_rate`).

---

## 2. MATRIZ DETALLADA DE ENTIDADES Y MECANISMOS DE SINCRONIZACIÓN

| Entidad | Origen | Destino | Método / Protocolo | Endpoint / Tabla | Persistencia | Sync ID / Identificador | Timestamps | Soporte Offline | Reintentos (Retry) | Manejo de Conflictos | Resultado de Auditoría |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Auth Session** | Web / Mobile | Supabase Auth | HTTPS / PostgREST | `/auth/v1/token` | JWT en Storage | User UUID | `exp`, `iat` | ❌ No | ✅ GoTrue SDK | Sobreescritura de sesión | ✅ **SINCRONIZADO** |
| **Atleta / Perfil** | Web | Supabase DB | PostgREST Client | `public.athletes` | PostgreSQL | Athlete UUID | `created_at`, `updated_at` | ❌ No | ❌ Manual | Última escritura gana | 🟡 **PARCIAL** (Mobile no lee perfil dinámico) |
| **Entrenamiento** | Web Builder | Supabase DB | Direct Insert / Update | `public.workouts` | PostgreSQL | Workout UUID | `target_date`, `created_at` | ❌ No | ❌ Manual | Error si falta FK | ✅ **SINCRONIZADO** |
| **Bloques Sesión** | Web Builder | Supabase DB | Batch Insert | `public.workout_blocks` | PostgreSQL | Block UUID | N/A | ❌ No | ❌ Manual | Cascada en DELETE | ✅ **SINCRONIZADO** |
| **Asignación Wkt** | Web Builder | Supabase DB | Batch Insert | `public.workout_assignments`| PostgreSQL | Assignment UUID | `assigned_at` | ❌ No | ❌ Manual | Error de duplicado PK | ✅ **SINCRONIZADO** |
| **Dispositivo** | Web / Mobile | Supabase DB | Upsert / Update | `public.devices` | PostgreSQL | Device UUID | `last_sync_at` | ❌ No | ❌ Manual | ON CONFLICT ID | ✅ **SINCRONIZADO** |
| **Asignación Dev** | Web / Mobile | Supabase DB | Insert / Update | `public.device_assignments` | PostgreSQL | Assignment UUID | `assigned_at` | ❌ No | ❌ Manual | Filtro fecha activa | ✅ **SINCRONIZADO** |
| **Carrera Activa** | Web Cockpit | Supabase DB | Ninguno (En memoria) | Ninguno | Estado Local | Timer JS | Reloj local | ❌ No | ❌ No | Pérdida al refrescar | 🔵 **SIMULADO** (No persiste) |
| **Carrera Mobile** | Mobile Cockpit| Supabase DB | Ninguno (En memoria) | Ninguno | Estado Local | Timer JS | Reloj local | ❌ No | ❌ No | Pérdida al salir | 🔵 **SIMULADO** (No persiste) |
| **Sesión Reloj** | Connect Watch | Supabase DB | REST / Supabase Client| `public.activities` | Flash / SQLite + DB | Session UUID | `start_time` | ✅ Sí | ✅ En cola | Reintento en cola | 🔴 **FALLO EN PAYLOAD** (`avg_hr` no existe) |
| **Importación FIT** | Web Import | Supabase DB | Direct Insert | `public.activity_inbox` | PostgreSQL | Inbox UUID | `synced_at` | ❌ No | ❌ Manual | Ninguno | 🟡 **PARCIAL** (Pendiente de parseo) |
| **Consolidación** | Web Inbox | Supabase DB | Move Insert + Delete | `inbox` → `activities` | PostgreSQL | Activity UUID | `start_time` | ❌ No | ❌ Manual | Ninguno | ✅ **SINCRONIZADO** |

---

## 3. AUDITORÍA DE IDEMPOTENCIA Y PREVENCIÓN DE DUPLICADOS

### Hallazgo Crítico:
Actualmente, si un reloj o un teléfono intenta sincronizar la misma sesión deportiva en dos ocasiones (por ejemplo, tras una desconexión momentánea de red o un reintento del usuario):

```text
Intento 1: POST /rest/v1/activities  ──> Inserta Registro ID: 1111 (8.12 km, 06:00 AM)
Intento 2: POST /rest/v1/activities  ──> Inserta Registro ID: 2222 (8.12 km, 06:00 AM)
```

**Resultado Actual:**
La base de datos crea dos actividades distintas con diferentes UUID generados por `gen_random_uuid()`, duplicando el kilometraje, la carga aguda (ATL) y alterando el ACWR del atleta.

### Recomendación Estructural de Idempotencia:
1. Agregar una columna `source_sync_id TEXT UNIQUE` o `external_id TEXT UNIQUE` en la tabla `public.activities`.
2. Para actividades registradas en smartwatch: calcular un checksum o utilizar el `session.id` emitido por el reloj.
3. Utilizar en PostgREST:
   ```typescript
   await supabase.from('activities').upsert(payload, { onConflict: 'source_sync_id' });
   ```

---

## 4. AUDITORÍA DEL FLUJO OFFLINE-FIRST (SMARTWATCH)

1. **Persistencia Local:**
   - La clase `WatchLocalStorageManager` en `src/lib/connect/syncProtocol.ts` implementa almacenamiento de sesiones en memoria local cuando no hay conexión.
   - Las sesiones reciben el estado inicial `syncStatus: 'pending'`.
2. **Ciclo de Reintentos:**
   - La función `syncWatchWithRunovaCloud()` filtra las sesiones locales en estado `'pending'` o `'failed'`.
   - Si la red está disponible, sube el lote y actualiza la bandera local a `'synced'` con marca de tiempo `syncedAt`.
3. **Punto de Ruptura Actual:**
   - Al ejecutar el `insert` contra Supabase:
     ```typescript
     avg_hr: session.avgHeartRateBpm,
     max_hr: session.maxHeartRateBpm,
     ```
   - El esquema de base de datos define:
     ```sql
     avg_heart_rate INT,
     max_heart_rate INT,
     ```
   - PostgREST responderá con HTTP 400 (`Could not find the 'avg_hr' column of 'activities' in the schema cache`), impidiendo que las sesiones del reloj se consoliden en la base de datos hasta alinear los identificadores.
