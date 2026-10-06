# RUNOVA — REPORTE FINAL DE AUDITORÍA INTEGRAL DEL SISTEMA

**Fecha:** 06 de Octubre de 2026  
**Auditor:** Antigravity AI Engineering Suite  
**Entorno:** Ecosistema Completo RUNOVA (Web, Mobile, Connect Engine, Supabase Cloud)

---

## 1. ESTADO GENERAL DEL SISTEMA

### 🟡 FUNCIONAL CON OBSERVACIONES

El sistema cuenta con una arquitectura de datos sólida en PostgreSQL (Supabase) y una interfaz web de alto rendimiento con TypeScript estricto. Sin embargo, no está 100% sincronizado de extremo a extremo debido a componentes en la aplicación móvil que aún operan con datos simulados, la ausencia de un microservicio de parseo de archivos FIT y una discrepancia en el esquema de carga de actividades desde RUNOVA Connect.

---

## 2. PORCENTAJE APROXIMADO DE FUNCIONALIDADES

| Categoría | Cobertura | Detalle |
| :--- | :---: | :--- |
| **Web Platform (Next.js 16)** | **88%** | 15 de 17 vistas operan directamente contra Supabase; Live y AI son simulados. |
| **Backend & Base de Datos** | **90%** | Esquemas relacionales completos, RLS estricto y funciones; requiere columnas de idempotencia. |
| **Mobile App (React Native)** | **40%** | Auth y dispositivos están sincronizados con la BD; entrenamiento en vivo, planes y biometría son simulados. |
| **RUNOVA Connect (Watch Engine)** | **75%** | Motor de ritmo, alertas y almacenamiento offline implementados; requiere corrección de payload de red. |
| **Integración E2E Global** | **62%** | El ecosistema está ensamblado pero presenta desconexiones puntuales en los extremos móviles y de IA. |

---

## 3. RESUMEN DE PRUEBAS TÉCNICAS EJECUTADAS

```text
BUILD (Next.js 16 Production)   PASS (Compilado en 1811ms, 0 errores)
TYPECHECK (Web TypeScript)      PASS (Exit code 0, 0 errores)
TYPECHECK (Mobile TypeScript)   PASS (Exit code 0, 0 errores)
LINT (ESLint 9)                 FAIL (55 errores react-hooks/set-state-in-effect, 75 advertencias)
UNIT TESTS                      NOT IMPLEMENTED (No hay suite de pruebas unitarias configurada)
E2E TESTS                       NOT IMPLEMENTED (No hay Cypress/Playwright en el proyecto)
API TESTS                       NOT IMPLEMENTED (Sin pruebas automatizadas de endpoints PostgREST)
SYNC TESTS                      NOT IMPLEMENTED (Sin pruebas de integración cruzada multi-dispositivo)
```

---

## 4. FUNCIONALIDADES OPERATIVAS (VERIFICADAS CON EVIDENCIA)

1. **Autenticación GoTrue:** Inicio de sesión, registro y persistencia de token JWT verificados tanto en Web (`src/lib/hooks/useAuth.ts`) como en Mobile (`mobile/src/lib/supabase.ts`).
2. **Creación y Asignación de Entrenamientos:** `WorkoutBuilderView.tsx` guarda títulos, categorías, objetivos y bloques jerárquicos en `workouts` y `workout_blocks`. La asignación genera registros reales en `workout_assignments`.
3. **Gestión de Atletas:** Operaciones CRUD completas en `AthletesManagementView.tsx` que persisten en la tabla `athletes` con soporte para atletas no autenticados gestionados por el club.
4. **Centro de Rendimiento (Banister):** `PerformanceCenterView.tsx` procesa el historial de actividades del atleta y genera las curvas dinámicas de Fitness (CTL, 42 días), Fatiga (ATL, 7 días) y Forma (TSB).
5. **Inventario y Préstamo de Dispositivos:** Gestión de sensores personales y pool del club conectada bidireccionalmente entre Web y Mobile mediante `devices` y `device_assignments`.
6. **Bandeja de Entrada de Actividades:** `ActivityInboxView.tsx` consulta `activity_inbox`, permitiendo aceptar o rechazar actividades antes de incorporarlas al registro oficial.
7. **Race Center:** Cuenta regresiva y cálculo de splits negativos calculados a partir de las carreras almacenadas en `races`.
8. **Exportación de Reportes:** Generación inmediata de archivos CSV y vistas imprimibles en `ReportsView.tsx` utilizando las actividades reales del atleta.

---

## 5. FUNCIONALIDADES PARCIALES

1. **Perfil del Atleta:** Solo puede ser editado por el entrenador desde la gestión del club; el atleta carece de una interfaz de edición propia en su vista técnica.
2. **Planificado vs Realizado:** Aunque lee entidades reales, los índices de adherencia global (`act.is_matched ? 90 : 70`) y de frecuencia cardíaca (`85%`) en `RunovaContext.tsx` están cableados como heurísticas fijas en lugar de compararse bloque a bloque.
3. **Importación de FIT / GPX:** `ActivityImportView.tsx` encola el archivo en `activity_inbox`, pero registra métricas en cero (`distance_km: 0`) porque no cuenta con un decodificador binario integrado.
4. **RUNOVA Connect Sync:** La máquina de estados y el almacenamiento local funcionan, pero el payload hacia Supabase usa nombres de columna desactualizados (`avg_hr` y `max_hr`).

---

## 6. FUNCIONALIDADES SIMULADAS / MOCK

1. **RUNOVA AI Coach:** En `RunovaAiView.tsx`, las respuestas se generan a través de un `switch/if` de palabras clave en el cliente (`lower.includes('semana')`). No se conecta a ninguna API de inteligencia artificial ni consulta la base de datos de manera semántica.
2. **Live Cockpit (Web y Mobile):** Las vistas de entrenamiento en vivo (`RunovaLiveView.tsx` y la pestaña `entrenar` en `mobile/App.tsx`) incrementan la distancia y el pulso con números aleatorios en un `setInterval`. Al finalizar la sesión, ninguna de las dos guarda la actividad en la base de datos.
3. **Métricas de la App Móvil:** La pantalla de inicio de `mobile/App.tsx` tiene quemados los textos `"Buenos días, Juan"`, `"Ready Score 78"`, `"6 × 800 m en Pista"` y `"VO2 Max 52.4"` directamente en el código de la vista.

---

## 7. PROBLEMAS CRÍTICOS (CLASIFICADOS POR PRIORIDAD)

### P0 — CRÍTICO (Bloquea sincronización de extremo a extremo)
- **Fallo en Payloads de RUNOVA Connect:** `src/lib/connect/syncProtocol.ts` envía `avg_hr` y `max_hr` a la tabla `activities`, la cual espera `avg_heart_rate` y `max_heart_rate`. La sincronización de entrenamientos de reloj falla al comunicarse con Supabase.
- **Falta de Persistencia en Carrera en Vivo:** Ni la web ni la app móvil guardan la carrera en `activities` al pulsar "Finalizar", impidiendo que una carrera ejecutada en vivo alimente el Centro de Rendimiento.

### P1 — ALTO (Inconsistencia de datos entre plataformas)
- **Desconexión de Datos en App Móvil:** La app móvil no consume los entrenamientos (`workouts`), el perfil (`athletes`) ni las actividades reales de Supabase; utiliza datos estáticos codificados en JSX.
- **Ausencia de Idempotencia:** La tabla `activities` no tiene restricción única (`source_sync_id`), lo que permite que una misma carrera se duplique si el reloj o el teléfono reintentan la sincronización.

### P2 — MEDIO (Cálculos aproximados o heurísticos)
- **Score de Cumplimiento Heurístico:** `PlanVsRealView` no calcula la adherencia analizando los intervalos reales frente a los planificados; asigna valores predeterminados (90% o 70%).
- **Falta de Parser Binario FIT/GPX:** Las actividades importadas desde archivos externos requieren entrada manual de datos en la bandeja de entrada.

### P3 — BAJO (Mantenimiento de código y UX)
- **Errores de ESLint:** 55 advertencias y errores de `react-hooks/set-state-in-effect` en hooks de datos que pueden generar re-renderizados innecesarios.
- **Edición de Perfil de Atleta:** Añadir formulario modal para que el corredor actualice su peso, altura y frecuencia cardíaca máxima de forma autónoma.

---

## 8. PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Alineación de Protocolos y Persistencia (Inmediato)
1. Corregir los nombres de columnas en `src/lib/connect/syncProtocol.ts` (`avg_heart_rate`, `max_heart_rate`) para asegurar la subida de carreras de reloj.
2. Conectar la acción "Finalizar" de `RunovaLiveView.tsx` y `mobile/App.tsx` para que inserte la actividad real en la tabla `activities`.
3. Agregar la columna `source_sync_id TEXT UNIQUE` a la tabla `activities` para evitar duplicados en reintentos.

### Fase 2: Conexión Real de la App Móvil (Prioridad Alta)
1. Reemplazar los datos estáticos en `mobile/App.tsx` por consultas dinámicas a `athletes`, `workouts` y `activities` utilizando el cliente de Supabase ya configurado.
2. Vincular el perfil del corredor y el entrenamiento del día con el usuario autenticado en la app.

### Fase 3: Analítica Precisa e Inteligencia Real (Prioridad Media)
1. Implementar el cálculo matemático del porcentaje de cumplimiento en `buildPlanVsReal` comparando ritmo planificado vs ritmo real y zona objetivo vs zona real.
2. Integrar un endpoint de IA real (OpenAI / Claude / Gemini) o motor RAG con los datos del atleta en `RunovaAiView.tsx`.
3. Incorporar un parser JavaScript liviano para decodificar archivos FIT y GPX en `ActivityImportView.tsx`.
