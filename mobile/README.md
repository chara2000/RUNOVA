# RUNOVA Mobile — React Native & Expo

Aplicación móvil nativa para corredores construida con **React Native**, **Expo**, **TypeScript** y conexión directa a **Supabase**.

## Funcionalidades Nativas
- **Inicio**: Home del corredor con Ready Score 78, próximo entrenamiento y volumen semanal.
- **Entrenar**: RUNOVA LIVE Cockpit en tiempo real con cronómetro, ritmo instantáneo, FC Zona 4 y cuenta regresiva de bloques.
- **Botón [+]**: Acciones rápidas flotantes (Nueva carrera, nuevo entreno, importar FIT/GPX, registro manual).
- **Análisis**: Centro de rendimiento longitudinal y radar de 6 dimensiones.
- **Perfil**: Ficha técnica, VO2 Max verificado (52.4 ml/kg/min) y calibración de 5 zonas de frecuencia cardíaca.
- **Supabase Auth**: Autenticación persistente con `@react-native-async-storage/async-storage`.

## Cómo Ejecutar la App Móvil

1. Entra al directorio:
   ```bash
   cd mobile
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo de Expo:
   ```bash
   npx expo start
   ```

4. Escanea el código QR con la app **Expo Go** en tu dispositivo físico (iOS o Android) o presiona `a` para emulador Android o `i` para simulador iOS.
