# RUNOVA CONNECT — Arquitectura Nativa para Smartwatch

> **"RUNOVA planifica. RUNOVA Connect ejecuta. RUNOVA registra. RUNOVA analiza. RUNOVA aprende de la evolución del atleta."**

---

## 1. Declaración de Misión y Filosofía

**RUNOVA Connect NO es:**
* ❌ Una simple pantalla de conexión Bluetooth.
* ❌ Un panel CRUD para gestionar inventario de dispositivos.
* ❌ Una página web comprimida para verse pequeña.
* ❌ Un integrador pasivo de APIs de terceros.

**RUNOVA Connect ES:**
> **UNA APLICACIÓN DE RUNNING DE ALTO RENDIMIENTO QUE VIVE DIRECTAMENTE EN EL RELOJ INTELIGENTE DEL ATLETA.**

Su propósito central es permitir que el corredor pueda **recibir, ejecutar, guiarse y registrar sus sesiones de entrenamiento directamente desde su muñeca**, con total autonomía del teléfono inteligente durante la carrera.

---

## 2. El Ecosistema RUNOVA en Tres Pilares

El ecosistema deportivo se estructura en tres experiencias complementarias conectadas a **RUNOVA Cloud**:

```
                              RUNOVA CLOUD
                      (Data Lake • AI Analytics • Sync)
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ↓                          ↓                          ↓
   RUNOVA WEB                 RUNOVA MOBILE              RUNOVA CONNECT
  (Desktop / Tablet)         (iOS & Android)               (Smartwatch)
         │                          │                          │
   Coach & Club                  Runner                    Wrist Active
         │                          │                          │
• Prescripción de sesiones  • Calendario del atleta    • Descarga de sesión
• Constructor de bloques    • Feed de actividades      • Guía visual en carrera
• Análisis longitudinal     • Métricas de recuperación • Sensores GPS / FC / Cad
• Cumplimiento y radar      • Sincronización manual    • Alertas hápticas y ritmo
• Gestión de atletas        • Chat y feedback coach    • Almacenamiento Offline
```

| Plataforma | Rol Principal | Interacción del Usuario | Entorno de Uso |
|---|---|---|---|
| **RUNOVA Web** | **Planificar + Administrar + Analizar Profundamente** | Teclado, ratón, pantallas grandes | Oficina, casa, análisis pre/post entrenamiento |
| **RUNOVA Mobile** | **Consultar + Gestionar + Revisar** | Pantalla táctil móvil | Día a día, vestuario, antes de salir |
| **RUNOVA Connect** | **Ejecutar + Guiar + Registrar en Vivo** | Miradas de 1 segundo, botones físicos, gestos táctiles simples | **En carrera, en pista, en montaña (movimiento activo)** |

---

## 3. Modelo Operativo Offline-First

El smartwatch debe ser completamente autónomo. El atleta no debe estar obligado a llevar un teléfono para registrar su carrera ni para seguir los intervalos prescritos por su entrenador.

```
       📱 TELÉFONO / NUBE
               │
               ▼  1. Sincronización previa (WiFi o Bluetooth Low Energy)
       ⌚ RELOJ (RUNOVA CONNECT)
               │
               ▼  2. Sesión del día descargada y almacenada en memoria local
       🏃 ATLETA SALE A CORRER (Sin teléfono)
               │
               ▼  3. Motor de ejecución nativo:
               │     • Posicionamiento GPS / GNSS
               │     • Sensor óptico de Frecuencia Cardíaca
               │     • Acelerómetro / Cadencia de zancada
               │     • Altímetro barométrico
               │
               ▼  4. Guía visual en carrera:
               │     • "Ritmo actual vs Objetivo"
               │     • "Intervalo 3 de 6 · 800m"
               │     • Alertas hápticas: "⚡ BAJA EL RITMO", "NEXT → 800m"
               │
               ▼  5. Finalización y guardado inmediato:
               │     • Almacenamiento local SQLite / Flash en el reloj
               │     • Comparativa automática Planificado vs. Realizado
               │
               ▼  6. Sincronización diferida (al volver al vestuario o casa)
       ☁️ RUNOVA CLOUD
```

---

## 4. Principios de Diseño para la Muñeca (Zenith Wrist UI)

Una interfaz de reloj no es un sitio web en miniatura. Corriendo a 4:00/km con lluvia, sudor o fatiga extrema, el atleta necesita **cognición instantánea**:

1. **Jerarquía Visual Inflexible:**
   * **RITMO (Pace) → DISTANCIA → TIEMPO → FC (BPM) → PROGRESO DEL BLOQUE**.
2. **Números Gigantescos y Alto Contraste:**
   * Tipografía deportiva monoespaciada en **Volt Neón (`#CCFF00`)** sobre negro absoluto OLED (`#000000`).
3. **Lectura en 500 Milisegundos:**
   * El corredor no lee texto largo; interpreta colores y cifras dominantes con una mirada de reojo.
4. **Interacción Mínima:**
   * Pantallas automáticas según el bloque de la sesión.
   * Botones de área táctil extendida (mínimo 44 × 44 pt) y compatibilidad con botones físicos (Digital Crown, Action Button, botones laterales).
5. **Paleta de Colores de Rendimiento:**
   * **Negro Puro (`#000000`):** Máxima eficiencia energética OLED y contraste infinito.
   * **Volt Neón (`#CCFF00`):** Métrica primaria (Ritmo objetivo y progreso).
   * **Cyan (`#00F0FF`):** Tiempo transcurrido y cadencia.
   * **Coral (`#FF4D26`):** Frecuencia cardíaca alta y advertencias críticas.
   * **Gris Técnico (`#94A3B8`):** Unidades y etiquetas de contexto.

---

## 5. Modos de Entrenamiento Soportados

### A. Carrera Continua (Rodaje / Fondo)
* **Objetivo:** Ritmo objetivo en ventana (ej. `05:00 – 05:20 /km`) o distancia meta (`10.0 km`).
* **Visualización:**
  ```
  ┌────────────────────────┐
  │         RUNOVA         │
  │                        │
  │       05:08 /km        │  <-- Ritmo actual gigante
  │                        │
  │        6.42 km         │  <-- Distancia
  │                        │
  │         32:48          │  <-- Tiempo transcurrido
  │                        │
  │       ♥ 152 BPM        │  <-- FC en Zona 3
  │   ──────────────────   │
  │      64% OBJETIVO      │
  │                        │
  │       [ PAUSAR ]       │
  └────────────────────────┘
  ```

### B. Intervalos y Series (Pista / Fartlek)
* **Objetivo:** Ejecutar bloques de trabajo a ritmo exigente seguidos de bloques de recuperación fija (por tiempo o distancia).
* **Visualización:**
  ```
  ┌────────────────────────┐
  │    INTERVALO 3 / 6     │
  │                        │
  │         800 m          │
  │                        │
  │   OBJ: 04:30  ACT: 04:26│  <-- Comparación viva
  │                        │
  │   RESTA: 320 m         │
  │                        │
  │       ♥ 168 BPM        │
  │   ──────────────────   │
  │   SIGUIENTE: REC 2:00  │
  └────────────────────────┘
  ```

### C. Entrenamiento por Zonas de Frecuencia Cardíaca
* **Objetivo:** Mantener la intensidad en un rango de pulso predefinido (ej. Zona 2 Aeróbica o Zona 4 Umbral).
* **Visualización:** Barra de zona en vivo con código de color dinámico y pulso háptico si se excede la zona superior.

---

## 6. Motor de Alertas Inteligentes Hápticas y Visuales

Las alertas no deben congelar la pantalla. Aparecen como un banner superior instantáneo de 3 segundos acompañado de una vibración háptica específica:

| Evento | Mensaje en Muñeca | Vibración Háptica | Acción del Atleta |
|---|---|---|---|
| **Ritmo Demasiado Rápido** | `⚡ BAJA EL RITMO` | 1 pulso largo | Aflojar paso |
| **Ritmo Demasiado Lento** | `🟠 ACELERA` | 2 pulsos cortos | Aumentar frecuencia |
| **Frecuencia Cardíaca Alta** | `♥ ZONA 5 EXTREMA` | 3 pulsos continuos | Recuperar aeróbicamente |
| **Objetivo de Intervalo Cumplido** | `✓ 800m COMPLETADOS` | Doble toque firme | Preparar recuperación |
| **Próximo Bloque** | `NEXT → RECUPERACIÓN 2:00` | 1 toque suave | Cambiar de fase |

---

## 7. Capa de Abstracción de Sensores (Sensor Hub)

RUNOVA Connect no acopla su lógica al fabricante del hardware. Utiliza un `SensorHub` que detecta dinámicamente las capacidades del reloj:

```
                      SMARTWATCH HARDWARE
                               │
       ┌───────────┬───────────┼───────────┬───────────┐
       ↓           ↓           ↓           ↓           ↓
      GPS       Óptico FC  Acelerómetro  Altímetro   Háptico
   (CoreLoc /   (HealthKit /  (Cadencia) (Barómetro) (Taptic /
   FusedLoc)     HeartRate)                           Vibrator)
       │           │           │           │           │
       └───────────┴───────────┼───────────┴───────────┘
                               ↓
                   RUNOVA SENSOR ABSTRACTION
                               ↓
                     NORMALIZED TELEMETRY
          (Pace, Distance, Time, HR, Zone, Cadence, Elev)
                               ↓
                     WORKOUT STATE MACHINE
```

Si el reloj carece de altímetro barométrico, la elevación se infiere después en RUNOVA Cloud mediante modelos de elevación digital (DEM). Si carece de sensor de cadencia, se usa la frecuencia de oscilación del acelerómetro de muñeca.

---

## 8. Ciclo Planificado vs. Realizado

RUNOVA conecta al entrenador con la muñeca del corredor en un circuito cerrado:

```
1. COACH EN WEB
   Crea sesión: "6 × 800m @ 4:30/km con 2:00 rec"
         │
         ▼
2. RUNOVA CLOUD
   Genera carga prescrita estructurada en formato JSON estandarizado
         │
         ▼
3. SMARTWATCH (RUNOVA CONNECT)
   Corredor sale a la pista, presiona "INICIAR"
         │
         ▼
4. EJECUCIÓN VIVA
   El reloj guía cada serie en tiempo real
         │
         ▼
5. REGISTRO OFFLINE & SPLITS
   • Intervalo 1: 800m en 3:34 (04:28/km) → 98% cumplimiento
   • Intervalo 2: 800m en 3:36 (04:30/km) → 100% cumplimiento
   • Intervalo 3: 800m en 3:38 (04:32/km) → 96% cumplimiento
         │
         ▼
6. RETORNO A RUNOVA WEB / MOBILE
   El entrenador recibe el análisis de cumplimiento milimétrico sin transcripción manual
```

---

## 9. Arquitectura Técnica Multiplataforma

Para llevar RUNOVA Connect a dispositivos de producción real, la implementación nativa se desglosa en los 3 ecosistemas principales:

```
                           RUNOVA CONNECT
                           (Shared Logic)
                                 │
         ┌───────────────────────┼───────────────────────┐
         ↓                       ↓                       ↓
      watchOS                 Wear OS              Garmin Connect IQ
   (Apple Watch)       (Samsung / Pixel Watch)    (Forerunner / Fenix)
         │                       │                       │
• SwiftUI / watchOS SDK • Jetpack Compose Wear OS• Monkey C
• HealthKit             • Health Services API    • Toybox.Sensor
• HKWorkoutSession      • Foreground Service     • Toybox.ActivityRecording
• CoreLocation (GPS)    • LocationManager Fused  • Toybox.Communications
• WatchConnectivity     • Wearable DataLayer API • Bluetooth Sync
```

### Especificación por Plataforma:

1. **Apple Watch (watchOS 10+):**
   * **Lenguaje:** Swift 5.9+ con SwiftUI.
   * **Servicios de fondo:** `HKWorkoutSession` con `HKLiveWorkoutBuilder` para garantizar que la app permanezca activa con la pantalla siempre encendida (*Always-On Display*).
   * **GPS:** `CLLocationManager` con precisión `kCLLocationAccuracyBestForNavigation`.
   * **Comunicaciones:** `WCSession` (WatchConnectivity) para transferir entrenamientos del iPhone al reloj en background.

2. **Google Wear OS (Wear OS 4 / 5):**
   * **Lenguaje:** Kotlin con Jetpack Compose for Wear OS.
   * **Sensores:** `Health Services API` (`ExerciseClient`) para seguimiento de frecuencia cardíaca con bajo consumo de batería.
   * **Comunicaciones:** `Wearable DataLayer API` para sincronizar con la app Android complementaria.

3. **Garmin Connect IQ (CIQ 4.0+):**
   * **Lenguaje:** Monkey C.
   * **Grabación:** `Toybox.ActivityRecording.createSession()` guardando directamente en archivos binarios estándar `.FIT`.
   * **Comunicaciones:** `Toybox.Communications` vía Bluetooth al teléfono móvil de la atleta.

---

## 10. Conclusión y Estado en el Repositorio

En este repositorio actual (Next.js + Expo Mobile):
* Se implementa el **Core Domain & State Machine** en TypeScript puro (`src/lib/connect/`), reutilizable y verificable.
* Se proporciona un **Simulador Interactivo de Smartwatch** en la plataforma para que entrenadores y atletas experimenten cómo funciona RUNOVA Connect en la muñeca antes de desplegarlo en las tiendas de aplicaciones de reloj.
* Se preparan los contratos de sincronización de datos con Supabase (`activities`, `workouts`).
