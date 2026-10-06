# RUNOVA — AUDITORÍA TÉCNICA Y DE ARQUITECTURA INTEGRAL

**Fecha de Auditoría:** 06 de Octubre de 2026  
**Entorno Auditado:** RUNOVA Full-Stack Ecosystem (Web + Mobile + Connect Engine + Supabase Cloud BaaS)  
**Proyecto:** juanchara-eng/CARTERAOS  
**Hash de Auditoría:** `AUDIT-RUNOVA-2026-10-06-FINAL`  
**Estado General:** 🟡 **FUNCIONAL CON OBSERVACIONES**

---

## 1. RESUMEN EJECUTIVO

Se ha ejecutado una auditoría exhaustiva y no destructiva sobre la totalidad del repositorio RUNOVA. No se asumió la existencia de ninguna funcionalidad por su presencia visual o estilística; cada módulo fue inspeccionado a nivel de código fuente, esquema de base de datos SQL, flujo de hooks y servicios de red.

### Hallazgos Principales:
1. **Núcleo Web y Base de Datos (Producción Real):**
   - El ecosistema Web Next.js 16 (Turbopack) opera directamente contra Supabase (`zoywwhhpipswfpigdlnb.supabase.co`).
   - La gestión de usuarios (Auth GoTrue), Atletas, Entrenadores, Clubes, Sesiones de Entrenamiento (`workouts`), Asignaciones (`workout_assignments`), Dispositivos (`devices`), Razas/Objetivos (`races`, `goals`) y Bandeja de Entrada (`activity_inbox`) está implementada con persistencia real y políticas RLS activas.
2. **App Móvil (React Native / Expo):**
   - Posee autenticación real contra Supabase y sincronización bidireccional en el catálogo de dispositivos e inventario (`mobile/src/lib/deviceService.ts`).
   - **Observación Crítica:** Los módulos de entrenamiento en vivo (`entrenar`), historial de sesiones, biometría (VO₂ Max) y plan de la semana están actualmente alimentados por estado local simulado en `mobile/App.tsx`. Al presionar "FINALIZAR", se emite un diálogo alertando guardado, pero no se realiza la mutación `insert` en la tabla `activities`.
3. **RUNOVA Connect (Smartwatch Running Engine):**
   - El motor de ejecución deportiva (`src/lib/connect/workoutEngine.ts`), el HUB de sensores (`sensorHub.ts`) y el simulador de hardware (Apple Watch Ultra 2, Galaxy Watch Wear OS, Garmin Forerunner 965 en `RunovaConnectView.tsx`) están plenamente desarrollados con algoritmos de desviación de ritmo y alertas hápticas.
   - **Observación Crítica:** En el protocolo de sincronización a la nube (`src/lib/connect/syncProtocol.ts`), las columnas enviadas en la carga útil utilizan nombres no concordantes (`avg_hr` y `max_hr` en lugar de `avg_heart_rate` y `max_heart_rate`), lo que provocará rechazo por parte de PostgreSQL al intentar sincronizar sesiones reales de reloj.
4. **Analítica e Inteligencia Artificial:**
   - **Performance Center:** 100% REAL. Implementa el modelo impulso-respuesta de Banister para calcular fitness (CTL), fatiga (ATL) y forma (TSB) a partir de las actividades reales del atleta.
   - **Plan vs Real:** PARCIAL. La vinculación de entidades es real, pero los cálculos de adherencia global y cardíaca en `RunovaContext.tsx` utilizan valores heurísticos fijos (`act.is_matched ? 90 : 70`).
   - **RUNOVA AI:** 🔵 **MOCK / SIMULADO**. No se conecta a un LLM ni ejecuta consultas SQL dinámicas; responde mediante condicionales `lower.includes('semana')` con textos predefinidos.

---

## 2. ARQUITECTURA DETECTADA

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RUNOVA CLOUD PLATFORM                             │
│                                                                             │
│                    ┌──────────────────────────────────┐                     │
│                    │     SUPABASE POSTGRESQL BAAS     │                     │
│                    │  • Auth GoTrue (JWT Sessions)    │                     │
│                    │  • Row-Level Security (RLS)      │                     │
│                    │  • PostgREST Direct Client       │                     │
│                    └────────────────┬─────────────────┘                     │
│                                     │                                       │
│          ┌──────────────────────────┼──────────────────────────┐            │
│          │                          │                          │            │
│          ▼                          ▼                          ▼            │
│  ┌───────────────┐          ┌───────────────┐          ┌───────────────┐    │
│  │  RUNOVA WEB   │          │ RUNOVA MOBILE │          │RUNOVA CONNECT │    │
│  │ (Next.js 16)  │          │(Expo/RN App)  │          │(Watch Engine) │    │
│  │ • SPA Router  │          │• Auth Sync    │          │• State Mach.  │    │
│  │ • RunovaCtx   │          │• Device Hub   │          │• Sensor Hub   │    │
│  │ • 17 Views    │          │• Cockpit Live │          │• Offline Flsh │    │
│  └───────┬───────┘          └───────┬───────┘          └───────┬───────┘    │
│          │                          │                          │            │
│          └──────────────────────────┼──────────────────────────┘            │
│                                     ▼                                       │
│                    ┌──────────────────────────────────┐                     │
│                    │        INTELLIGENCE LAYER        │                     │
│                    │  • Banister CTL/ATL/TSB (Real)   │                     │
│                    │  • Plan vs Real (Parcial)        │                     │
│                    │  • AI Coach (Simulado)           │                     │
│                    └──────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tecnologías Identificadas:
- **Frontend Web:** Next.js 16.3.8 (Turbopack), React 19.2.8, TypeScript 5, Tailwind CSS 4, Lucide React, Sonner/ZenithToaster, Canvas Confetti.
- **Frontend Móvil:** React Native / Expo, `@supabase/supabase-js`, `@react-native-async-storage/async-storage`.
- **Base de Datos & Backend:** Supabase (PostgreSQL 15+), GoTrue Auth, PostgREST, RLS Multi-tenant.
- **Smartwatch Engine:** Dominio agnóstico en TypeScript (`src/lib/connect/`), simulador háptico e interfaz de alta legibilidad para watchOS, Wear OS y Garmin CIQ.

---

## 3. MÓDULOS ENCONTRADOS Y ESTADO DE INTEGRACIÓN

| Módulo Web / Ruta | Archivo de Implementación | Fuente de Datos | Estado Técnico |
| :--- | :--- | :--- | :--- |
| **Login / Auth** | `SecureLoginView.tsx` | Supabase GoTrue Auth | ✅ FUNCIONANDO |
| **Onboarding** | `OnboardingView.tsx` | Supabase `profiles` / `athletes` | ✅ FUNCIONANDO |
| **Athlete Dashboard** | `AthleteDashboardView.tsx` | Supabase `activities`, `workouts` | ✅ FUNCIONANDO |
| **Coach Dashboard** | `CoachDashboardView.tsx` | Supabase `athletes`, `coaches` | ✅ FUNCIONANDO |
| **Club Dashboard** | `ClubDashboardView.tsx` | Supabase `clubs`, `athletes` | ✅ FUNCIONANDO |
| **Athlete Profile** | `AthleteProfileView.tsx` | Supabase `athletes` (Read-only) | 🟡 PARCIAL (Sin edición) |
| **Athletes Management** | `AthletesManagementView.tsx` | Supabase `athletes` CRUD | ✅ FUNCIONANDO |
| **Workout Builder** | `WorkoutBuilderView.tsx` | Supabase `workouts`, `blocks` | ✅ FUNCIONANDO |
| **Workout Assign** | `WorkoutBuilderView.tsx` | Supabase `workout_assignments` | ✅ FUNCIONANDO |
| **Runova Live (Web)** | `RunovaLiveView.tsx` | Simulador JS Timer | 🔵 SIMULADO (No persiste) |
| **Plan vs Real** | `PlanVsRealView.tsx` | Supabase + Heurística fija | 🟡 PARCIAL |
| **Performance Center** | `PerformanceCenterView.tsx` | Algoritmo Banister CTL/ATL/TSB | ✅ FUNCIONANDO |
| **Race Center** | `RaceCenterView.tsx` | Supabase `races` + Countdown | ✅ FUNCIONANDO |
| **Device Hub / Connect** | `RunovaConnectView.tsx` | Engine + Supabase Sync | 🟡 PARCIAL (Column drift) |
| **Activity Import** | `ActivityImportView.tsx` | Supabase `activity_inbox` | 🟡 PARCIAL (Sin parseo binario) |
| **Activity Inbox** | `ActivityInboxView.tsx` | Supabase `activity_inbox` | ✅ FUNCIONANDO |
| **Reports** | `ReportsView.tsx` | Exportador CSV / Impresión | ✅ FUNCIONANDO |
| **AI Coach** | `RunovaAiView.tsx` | Strings condicionales en cliente | 🔵 MOCK / SIMULADO |

---

## 4. AUDITORÍA DE BASE DE DATOS Y RELACIONES

### Tablas Auditadas en Supabase:
1. `profiles`: Usuarios y roles (`ADMIN`, `COACH`, `ASSISTANT`, `ATHLETE`).
2. `clubs`: Entidades de club con aislamiento multi-inquilino.
3. `coaches`: Perfil técnico con relación `user_id` y `club_id`.
4. `athletes`: Registro de atleta con zonas cardíacas JSONB, métricas fisiológicas y `user_id` nullable (para atletas gestionados por el club sin cuenta).
5. `groups`: Grupos de entrenamiento por nivel o distancia.
6. `workouts`: Sesiones planificadas con categorías normalizadas.
7. `workout_blocks`: Intervalos y bloques de intensidad estructurados.
8. `workout_assignments`: Asignación N:M de entrenamientos a atletas con estado de cumplimiento.
9. `activities`: Telemetría consolidada de carreras ejecutadas.
10. `devices`: Inventario de hardware propio y pool del club.
11. `device_assignments`: Asignaciones temporales de dispositivos a atletas.
12. `activity_inbox`: Bandeja de entrada de archivos importados previo a consolidación.
13. `races`: Calendario competitivo y objetivos principales.
14. `goals`: Metas periódicas de kilometraje y volumen.
15. `notifications`: Notificaciones push y recordatorios del sistema.

### Deficiencias de Integridad Detectadas:
- **Falta de Idempotencia en Actividades:** No existe una restricción `UNIQUE (athlete_id, start_time)` o `source_sync_id`. La sincronización repetida de una misma sesión generará registros duplicados en `activities`.
- **Deriva de Nombres de Columnas:** En `syncProtocol.ts` se intenta insertar `avg_hr` y `max_hr`, pero la tabla `activities` en la base de datos se definió con `avg_heart_rate` y `max_heart_rate`.
- **Parseo de Archivos:** `ActivityImportView.tsx` sube metadatos con `distance_km: 0` a `activity_inbox`, requiriendo un parser WebAssembly o microservicio para decodificar streams binarios FIT/GPX.

---

## 5. AUDITORÍA DE SEGURIDAD Y PERMISOS (RLS)

1. **Aislamiento Multi-Club:**
   - La migración `20261003000002_rls_policies.sql` implementa funciones `SECURITY DEFINER` (`coach_manages_athlete`, `is_admin`, `get_my_role`).
   - Los entrenadores solo tienen acceso a los atletas sobre los que tienen una relación activa en `coach_athlete_relations`.
2. **Consumo Directo desde Cliente:**
   - Todo el acceso a Supabase se realiza mediante `@supabase/supabase-js` utilizando la llave `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - La seguridad recae íntegramente en las políticas RLS de PostgreSQL. No existen endpoints API intermediarios con vulnerabilidades de bypass.
3. **Manejo de Sesión:**
   - Persistencia de tokens JWT mediante `localStorage` en Web y `AsyncStorage` en Mobile.
   - Detección de expiración y auto-refresco implementados en GoTrue.
