# MATRIZ MAESTRA DE FUNCIONALIDADES — RUNOVA ECOSYSTEM

**Fecha de Evaluación:** 06 de Octubre de 2026  
**Criterio de Evaluación:** Verificación de código fuente, flujos de red, esquemas SQL y consistencia entre plataformas.

### Leyenda de Estados:
* ✅ **FUNCIONANDO**: Código implementado, conectado a base de datos / hardware y operativo de extremo a extremo.
* 🟡 **PARCIAL**: Implementado funcionalmente pero con limitaciones, cálculos fijos o deriva de campos.
* 🔴 **ROTO**: Presenta fallos de ejecución, errores de red o excepciones al invocarse.
* ⚪ **NO IMPLEMENTADO**: No existe código o interfaz para la función.
* 🔵 **MOCK / DEMO**: Interfaz visual presente pero dependiente de datos quemados en cliente o temporizadores sin persistencia.

---

## 1. MATRIZ INTEGRAL POR FUNCIONALIDAD

| ID | Funcionalidad | Web | Mobile | Watch | Backend | DB | API | Sync | Estado Global | Evidencia & Observaciones |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **F001** | **Autenticación (Login/Registro)** | ✅ | ✅ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | GoTrue Auth en Supabase. Sesión JWT persistente en Web (`localStorage`) y Mobile (`AsyncStorage`). |
| **F002** | **Perfil del Atleta (Lectura)** | ✅ | 🔵 | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 PARCIAL | Web lee de `athletes`. Mobile tiene datos de Juan David quemados en JSX. Watch lee vía engine. |
| **F003** | **Perfil del Atleta (Edición)** | 🟡 | ⚪ | ⚪ | ✅ | ✅ | ✅ | 🟡 | 🟡 PARCIAL | Solo editable por Coach en Web (`AthletesManagementView`). No hay formulario de auto-edición para el atleta. |
| **F004** | **Planificación de Entrenamientos** | ✅ | ⚪ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | `WorkoutBuilderView.tsx` crea sesiones y bloques en `workouts` y `workout_blocks`. |
| **F005** | **Asignación de Entrenamientos** | ✅ | ⚪ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | Asignación individual/grupal guardada en `workout_assignments` en Supabase. |
| **F006** | **Ejecución en Smartwatch (Connect)** | 🟡 | ⚪ | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 PARCIAL | Motor `workoutEngine.ts` funcional con alertas y laps. Falla envío a DB por nombres `avg_hr` vs `avg_heart_rate`. |
| **F007** | **Cockpit de Carrera en Vivo (Live)** | 🔵 | 🔵 | ✅ | ⚪ | ⚪ | ⚪ | ⚪ | 🔵 MOCK / DEMO | Web (`RunovaLiveView`) y Mobile usan temporizadores simulados. Al finalizar no hacen `insert` en `activities`. |
| **F008** | **Telemetría GPS (Distancia/Ritmo)** | 🟡 | 🔵 | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 PARCIAL | Watch Engine convierte `speedMps` a ritmo y distancia real. Web y Mobile simulan incremento de km por segundo. |
| **F009** | **Frecuencia Cardíaca (Sensores BLE)** | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ FUNCIONANDO | Web Bluetooth (`useBluetooth.ts`) conecta a estándar GATT 0x180D. Mobile tiene radar mock + DB sync. |
| **F010** | **Cadencia y Dinámica de Carrera** | 🟡 | 🔵 | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 PARCIAL | Watch `sensorHub.ts` ingesta spm. Web/Mobile lo simulan con números pseudoaleatorios en vivo. |
| **F011** | **Almacenamiento Offline** | ⚪ | ⚪ | ✅ | ⚪ | ⚪ | ⚪ | ✅ | ✅ FUNCIONANDO | `WatchLocalStorageManager` almacena sesiones completadas en memoria local y maneja cola de reintentos. |
| **F012** | **Idempotencia y Anti-Duplicados** | ⚪ | ⚪ | ⚪ | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 ROTO / AUSENTE | No existen llaves únicas de idempotencia. Sincronizar dos veces una sesión genera duplicados en `activities`. |
| **F013** | **Planificado vs Realizado** | 🟡 | ⚪ | 🟡 | ✅ | ✅ | ✅ | 🟡 | 🟡 PARCIAL | Muestra datos de `workouts` y `activities`, pero el score de adherencia está fijo (`is_matched ? 90 : 70`). |
| **F014** | **Centro de Rendimiento (Banister)** | ✅ | 🔵 | ⚪ | ✅ | ✅ | ✅ | 🟡 | ✅ FUNCIONANDO | Web calcula matemáticamente CTL (42d), ATL (7d) y TSB con el modelo Banister desde actividades en BD. |
| **F015** | **Evolución Longitudinal** | ✅ | 🔵 | ⚪ | ✅ | ✅ | ✅ | 🟡 | 🟡 PARCIAL | Web computa tendencias desde actividades. Mobile tiene tabla de comparación estática. |
| **F016** | **Runova Readiness Score** | 🟡 | 🔵 | ⚪ | ✅ | ✅ | ✅ | 🟡 | 🟡 PARCIAL | Algoritmo basado en ACWR, cumplimiento y carga. Presenta advertencia orientativa. Mobile usa score fijo 78. |
| **F017** | **Gestión de Dispositivos (Pool/Personal)** | ✅ | ✅ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | Tabla `devices` y `device_assignments` sincronizada entre Web y Mobile. Soporta pool de club y sensores propios. |
| **F018** | **Módulo Entrenador (Coach Base)** | ✅ | ⚪ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | Gestión de roster, alertas de sobrecarga (ACWR > 1.3), asignación de sesiones y reportes. |
| **F019** | **Módulo Club (Multi-tenant)** | ✅ | ⚪ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | Tableros de club, aislamiento por políticas RLS y gestión de grupos. |
| **F020** | **Race Center (Calendario/Estrategia)** | ✅ | ⚪ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | Carga de carreras desde BD, countdown en tiempo real y cálculo de splits negativos/even pacing. |
| **F021** | **Importación de Actividades (FIT/GPX)** | 🟡 | ⚪ | ⚪ | ✅ | ✅ | ✅ | 🟡 | 🟡 PARCIAL | Carga y encolado en `activity_inbox`. Falta parser binario que extraiga campos automáticamente. |
| **F022** | **Bandeja de Actividades (Inbox)** | ✅ | ⚪ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | Visualización, aprobación hacia `activities` y descarte en Supabase. |
| **F023** | **Informes & Exportación (CSV/PDF)** | ✅ | ⚪ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ FUNCIONANDO | Generación y descarga instantánea de CSV y formato imprimible para atleta, club y carga. |
| **F024** | **RUNOVA AI Coach** | 🔵 | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | 🔵 MOCK / DEMO | Basado en coincidencia de strings en cliente (`if includes 'semana'`). No consume LLM ni telemetría dinámica. |

---

## 2. BALANCE GENERAL DE COBERTURA

- **Total Funcionalidades Auditadas:** 24
- **Totalmente Operativas (✅):** 11 (45.8%)
- **Parcialmente Implementadas (🟡):** 9 (37.5%)
- **Simuladas / Mock (🔵):** 3 (12.5%)
- **Rotas o con Fallo Estructural (🔴):** 1 (4.2%) — *Idempotencia y prevención de duplicados*
