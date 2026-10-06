import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { supabase } from './src/lib/supabase';
import {
  MobileDevice,
  fetchDevicesFromSupabase,
  syncDeviceToSupabase,
  BLE_DISCOVERABLE_DEVICES,
  INITIAL_DEVICES,
} from './src/lib/deviceService';

const { width } = Dimensions.get('window');

type TabType = 'inicio' | 'entrenar' | 'connect' | 'analisis' | 'perfil';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [isPlusOpen, setIsPlusOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('juan.david@runova.com');
  const [password, setPassword] = useState('RunovaPro2026!');
  const [authError, setAuthError] = useState<string | null>(null);

  // Live Run State (RUNOVA LIVE)
  const [isLiveRunning, setIsLiveRunning] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(1472); // 24:32
  const [distanceKm, setDistanceKm] = useState(5.24);
  const [heartRate, setHeartRate] = useState(163);

  // Dynamic Supabase data
  const [athlete, setAthlete] = useState<any>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [weekStats, setWeekStats] = useState({ km: 32.4, sessions: 4, timeFormatted: '3h 12m' });

  // RUNOVA CONNECT — Sensor Telemetry & Device State
  const [devices, setDevices] = useState<MobileDevice[]>(INITIAL_DEVICES);
  const [connectedDevice, setConnectedDevice] = useState<MobileDevice | null>(INITIAL_DEVICES[0]);
  const [connectSubTab, setConnectSubTab] = useState<'mis_sensores' | 'pool' | 'radar'>('mis_sensores');
  const [isScanning, setIsScanning] = useState(false);
  const [radarList, setRadarList] = useState<MobileDevice[]>(BLE_DISCOVERABLE_DEVICES);

  const fetchDashboardData = async (userId?: string) => {
    try {
      // 1. Cargar atleta
      let athQuery = supabase.from('athletes').select('*');
      if (userId) {
        athQuery = athQuery.eq('user_id', userId);
      }
      const { data: athData } = await athQuery.limit(1);
      let curAth = athData?.[0];
      if (!curAth) {
        const { data: anyAth } = await supabase.from('athletes').select('*').limit(1);
        curAth = anyAth?.[0];
      }
      if (curAth) setAthlete(curAth);

      // 2. Cargar entrenamiento planificado
      const { data: wktData } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      if (wktData?.[0]) setTodayWorkout(wktData[0]);

      // 3. Cargar actividades recientes
      if (curAth?.id) {
        const { data: actData } = await supabase
          .from('activities')
          .select('*')
          .eq('athlete_id', curAth.id)
          .order('start_time', { ascending: false })
          .limit(20);
        if (actData && actData.length > 0) {
          const sumKm = actData.reduce((acc: number, a: any) => acc + (Number(a.distance_km) || 0), 0);
          const sumSec = actData.reduce((acc: number, a: any) => acc + (Number(a.duration_sec) || 0), 0);
          const h = Math.floor(sumSec / 3600);
          const m = Math.floor((sumSec % 3600) / 60);
          setWeekStats({
            km: Number(sumKm.toFixed(1)),
            sessions: actData.length,
            timeFormatted: `${h}h ${m}m`,
          });
        }
      }
    } catch (err) {
      console.warn('[mobile] Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      void fetchDashboardData(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      void fetchDashboardData(session?.user?.id);
    });

    // Cargar dispositivos sincronizados con la BD de Supabase
    fetchDevicesFromSupabase().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setDevices(loaded);
        const active = loaded.find((d) => d.status === 'connected') || loaded[0];
        setConnectedDevice(active || null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handlers para RUNOVA CONNECT
  const handleConnectDevice = async (device: MobileDevice) => {
    setConnectedDevice(device);
    setDevices((prev) =>
      prev.map((d) => (d.id === device.id ? { ...d, status: 'connected' } : { ...d, status: 'idle' }))
    );
    await syncDeviceToSupabase({ ...device, status: 'connected' }, session?.user?.id);
    alert(`Sensor "${device.name}" vinculado a tu sesión.`);
  };

  const handleDisconnectDevice = async () => {
    if (connectedDevice) {
      await syncDeviceToSupabase({ ...connectedDevice, status: 'idle' }, session?.user?.id);
    }
    setConnectedDevice(null);
    setDevices((prev) => prev.map((d) => ({ ...d, status: 'idle' })));
  };

  // Compute real-time pace from current distance + elapsed seconds
  const livePace = React.useMemo((): string => {
    if (!distanceKm || distanceKm < 0.01 || !elapsedSec) return '--:--';
    const secPerKm = elapsedSec / distanceKm;
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [distanceKm, elapsedSec]);

  const handleFinishLiveRun = async () => {
    try {
      const athId = athlete?.id;
      if (!athId) {
        alert('No se encontró perfil de atleta. Inicia sesión primero.');
        return;
      }
      const { error } = await supabase.from('activities').insert([
        {
          athlete_id: athId,
          workout_id: todayWorkout?.id || null,
          title: todayWorkout?.title ? `[Mobile] ${todayWorkout.title}` : 'Carrera Live Móvil',
          start_time: new Date(Date.now() - elapsedSec * 1000).toISOString(),
          distance_km: Number(distanceKm.toFixed(2)),
          duration_sec: elapsedSec,
          avg_pace: livePace !== '--:--' ? livePace : null,
          avg_heart_rate: heartRate,
          max_heart_rate: heartRate + 8,
          avg_cadence: 176,
          format: 'LIVE',
          source_sync_id: `mobile-live-${Date.now()}-${athId}`,
        },
      ]);
      if (error) {
        console.warn('[mobile] Error guardando actividad:', error);
        alert(`Sesión finalizada. (${error.message})`);
      } else {
        alert(`¡Entrenamiento de ${distanceKm.toFixed(2)} km a ${livePace}/km guardado en RUNOVA!`);
        void fetchDashboardData(session?.user?.id);
      }
    } catch (err: any) {
      alert(`Guardado completado: ${err?.message || 'Ok'}`);
    }
    setActiveTab('inicio');
  };

  const handleStartScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setRadarList(BLE_DISCOVERABLE_DEVICES);
      alert('¡3 dispositivos BLE detectados en el radar!');
    }, 1800);
  };

  // Timer simulation for RUNOVA LIVE
  useEffect(() => {
    let timer: any;
    if (activeTab === 'entrenar' && isLiveRunning) {
      timer = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
        setDistanceKm((d) => Number((d + 0.0035).toFixed(3)));
        setHeartRate(160 + Math.floor(Math.random() * 6));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTab, isLiveRunning]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAuthSubmit = async () => {
    setAuthError(null);
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSession(data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: 'Juan David Riascos', role: 'ATHLETE' } },
        });
        if (error) throw error;
        alert('Cuenta creada exitosamente en Supabase. Ahora inicia sesión.');
        setAuthMode('login');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error de conexión con Supabase');
    }
  };

  // If not logged in and no mock bypass
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#08090D" />
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authLogoContainer}>
            <Text style={styles.brandTitle}>
              RUN<Text style={{ color: '#CCFF00' }}>OVA</Text>
            </Text>
            <Text style={styles.brandSubtitle}>RUNNING INTELLIGENCE PLATFORM</Text>
            <View style={styles.dbBadge}>
              <View style={styles.dbDot} />
              <Text style={styles.dbText}>Supabase zoywwhhpipswfpigdlnb</Text>
            </View>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.authHeading}>
              {authMode === 'login' ? 'Iniciar Sesión' : 'Registro de Corredor'}
            </Text>

            {authError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONTRASEÑA</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#64748B"
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleAuthSubmit}>
              <Text style={styles.primaryButtonText}>
                {authMode === 'login' ? 'ENTRAR A RUNOVA' : 'CREAR CUENTA'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBypassButton}
              onPress={() => setSession({ user: { email: 'juan.david@runova.com' } })}
            >
              <Text style={styles.demoBypassText}>
                Continuar como Juan David (Demo Rápido)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              style={{ marginTop: 12 }}
            >
              <Text style={styles.switchAuthText}>
                {authMode === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#08090D" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            RUN<Text style={{ color: '#CCFF00' }}>OVA</Text>
          </Text>
          <Text style={styles.headerSub}>Puerto Tejada Runners</Text>
        </View>

        {/* Quick Connect Pill */}
        <TouchableOpacity
          onPress={() => setActiveTab('connect')}
          style={[
            styles.headerConnectPill,
            connectedDevice && { borderColor: '#CCFF00', backgroundColor: 'rgba(204,255,0,0.1)' },
          ]}
        >
          <View style={[styles.dbDot, { backgroundColor: connectedDevice ? '#CCFF00' : '#94A3B8' }]} />
          <Text style={[styles.headerConnectText, connectedDevice && { color: '#CCFF00' }]}>
            {connectedDevice ? `${connectedDevice.name.split(' ')[0]} ${connectedDevice.battery_level}%` : 'CONNECT'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => supabase.auth.signOut().then(() => setSession(null))}
          style={styles.logoutPill}
        >
          <Text style={styles.logoutText}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Views */}
      <ScrollView contentContainerStyle={styles.mainScroll}>
        
        {/* TAB 1: INICIO (HOME DEL CORREDOR) */}
        {activeTab === 'inicio' && (
          <View style={styles.viewContent}>
            <Text style={styles.greetingTitle}>
              Buenos días, {athlete?.full_name ? athlete.full_name.split(' ')[0] : 'Juan'} 👋
            </Text>
            <Text style={styles.greetingSub}>
              {athlete?.level ? `Nivel ${athlete.level} • ${athlete.preferred_distance || '10K'}` : 'Fase: Potencia Aeróbica • 10K Competición'}
            </Text>

            {/* ESTADO DE HOY (READY SCORE) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTag}>ESTADO DE HOY</Text>
                <Text style={styles.tagGreen}>ÓPTIMO</Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.bigScore}>{athlete?.ready_score || 78}</Text>
                <View>
                  <Text style={styles.scoreLabel}>READY SCORE</Text>
                  <Text style={styles.scoreSub}>
                    HRV {athlete?.hrv_baseline_ms || 72}ms • Carga ACWR {athlete?.acwr || 1.08}
                  </Text>
                </View>
              </View>
              
              <View style={styles.barGroup}>
                <Text style={styles.barLabel}>Recuperación ({athlete?.compliance_rate ? Math.round(athlete.compliance_rate) : 82}%)</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${athlete?.compliance_rate ? Math.round(athlete.compliance_rate) : 82}%`, backgroundColor: '#CCFF00' }]} />
                </View>
              </View>
            </View>

            {/* PRÓXIMO ENTRENAMIENTO */}
            <View style={[styles.card, { borderColor: '#CCFF00' }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardSectionTag, { color: '#CCFF00' }]}>PRÓXIMO ENTRENAMIENTO</Text>
                <Text style={styles.tagTime}>Hoy • 06:00 AM</Text>
              </View>
              <Text style={styles.workoutHeading}>
                {todayWorkout?.title || '6 × 800 m en Pista'}
              </Text>
              <Text style={styles.workoutPace}>
                {todayWorkout ? `Ritmo: ${todayWorkout.target_pace} • ${todayWorkout.target_hr_zone}` : 'Ritmo Objetivo: 4:25 – 4:35/km • Zona 4'}
              </Text>
              
              {/* Sensor Badge */}
              <TouchableOpacity
                onPress={() => setActiveTab('connect')}
                style={styles.homeSensorRow}
              >
                <View style={[styles.dbDot, { backgroundColor: connectedDevice ? '#CCFF00' : '#F59E0B' }]} />
                <Text style={styles.homeSensorText}>
                  {connectedDevice
                    ? `Sensor: ${connectedDevice.name} (${connectedDevice.battery_level}%)`
                    : 'Sin sensor BLE vinculado • Toca para conectar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.limeButton}
                onPress={() => setActiveTab('entrenar')}
              >
                <Text style={styles.limeButtonText}>INICIAR ENTRENAMIENTO</Text>
              </TouchableOpacity>
            </View>

            {/* ESTA SEMANA */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTag}>ESTA SEMANA</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{weekStats.km}</Text>
                  <Text style={styles.statUnit}>km</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{weekStats.sessions}</Text>
                  <Text style={styles.statUnit}>sesiones</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{weekStats.timeFormatted}</Text>
                  <Text style={styles.statUnit}>tiempo</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: ENTRENAR (RUNOVA LIVE COCKPIT HUD) */}
        {activeTab === 'entrenar' && (
          <View style={styles.viewContent}>
            <View style={styles.liveBadgeRow}>
              <View style={styles.redDot} />
              <Text style={styles.liveBadgeText}>RUNOVA LIVE COCKPIT</Text>
            </View>

            {/* Giant Distancia & Tiempo */}
            <View style={styles.liveBigRow}>
              <View style={styles.liveHeroCard}>
                <Text style={styles.liveHeroLabel}>DISTANCIA</Text>
                <Text style={styles.liveGiantNum}>{distanceKm.toFixed(2)}</Text>
                <Text style={styles.liveGiantUnit}>KM</Text>
              </View>

              <View style={styles.liveHeroCard}>
                <Text style={styles.liveHeroLabel}>TIEMPO</Text>
                <Text style={[styles.liveGiantNum, { color: '#00F0FF' }]}>
                  {formatTime(elapsedSec)}
                </Text>
                <Text style={styles.liveGiantUnit}>MIN</Text>
              </View>
            </View>

            {/* Ritmo y FC */}
            <View style={styles.liveSplitRow}>
              <View style={styles.liveSmallCard}>
                <Text style={styles.liveSmallLabel}>RITMO</Text>
                <Text style={[styles.liveSmallNum, { color: '#CCFF00' }]}>{livePace}/km</Text>
              </View>

              <View style={[styles.liveSmallCard, { borderColor: '#FF4D26' }]}>
                <Text style={styles.liveSmallLabel}>FC (ZONA 4)</Text>
                <Text style={[styles.liveSmallNum, { color: '#FF4D26' }]}>{heartRate} BPM</Text>
              </View>
            </View>

            {/* Próximo bloque */}
            <View style={styles.nextBlockCard}>
              <Text style={styles.nextBlockTag}>PRÓXIMO BLOQUE</Text>
              <Text style={styles.nextBlockTitle}>800 METROS — Serie 4 de 6</Text>
              <Text style={styles.nextBlockSub}>Ritmo: 4:25/km • Descanso: 02:18</Text>
            </View>

            {/* Controles de pausa/finalizar */}
            <View style={styles.liveControlsRow}>
              <TouchableOpacity
                style={[styles.pauseBtn, { backgroundColor: isLiveRunning ? '#F59E0B' : '#CCFF00' }]}
                onPress={() => setIsLiveRunning(!isLiveRunning)}
              >
                <Text style={styles.pauseBtnText}>
                  {isLiveRunning ? 'PAUSAR' : 'REANUDAR'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.finishBtn}
                onPress={handleFinishLiveRun}
              >
                <Text style={styles.finishBtnText}>FINALIZAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB: RUNOVA CONNECT (HUB DE DISPOSITIVOS & SENSORES BLE) */}
        {activeTab === 'connect' && (
          <View style={styles.viewContent}>
            <View style={styles.connectHeaderRow}>
              <View>
                <Text style={styles.greetingTitle}>RUNOVA CONNECT</Text>
                <Text style={styles.greetingSub}>Hub de telemetría y sensores en vivo</Text>
              </View>
              <View style={styles.bleGattBadge}>
                <Text style={styles.bleGattBadgeText}>BLE GATT</Text>
              </View>
            </View>

            {/* HERO: SENSOR ACTIVO */}
            {connectedDevice ? (
              <View style={[styles.card, { borderColor: '#CCFF00', backgroundColor: '#0A120A' }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.dbDot, { backgroundColor: '#CCFF00' }]} />
                    <Text style={[styles.cardSectionTag, { color: '#CCFF00' }]}>SENSOR VINCULADO</Text>
                  </View>
                  <Text style={styles.tagGreen}>EN LÍNEA</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroSensorTitle}>{connectedDevice.name}</Text>
                    <Text style={styles.heroSensorModel}>{connectedDevice.brand} • Mod: {connectedDevice.model}</Text>
                    <Text style={styles.heroSensorSerial}>SN: {connectedDevice.serial_number || 'PLR-BT-001'}</Text>
                  </View>
                  <View style={styles.heroLiveHrBox}>
                    <Text style={styles.heroLiveHrNum}>{heartRate}</Text>
                    <Text style={styles.heroLiveHrLabel}>BPM LIVE</Text>
                  </View>
                </View>

                {/* Battery Gauge */}
                <View style={styles.batteryRow}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.batteryLabel}>Nivel de Batería</Text>
                    <Text style={styles.batteryPercent}>{connectedDevice.battery_level}%</Text>
                  </View>
                  <View style={styles.batteryBarBg}>
                    <View
                      style={[
                        styles.batteryBarFill,
                        {
                          width: `${connectedDevice.battery_level}%`,
                          backgroundColor: connectedDevice.battery_level > 25 ? '#CCFF00' : '#FF4D26',
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.limeButton, { flex: 1, paddingVertical: 10 }]}
                    onPress={() => setActiveTab('entrenar')}
                  >
                    <Text style={styles.limeButtonText}>USAR EN LIVE COCKPIT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.disconnectBtn}
                    onPress={handleDisconnectDevice}
                  >
                    <Text style={styles.disconnectBtnText}>DESCONECTAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.card, { borderColor: '#F59E0B' }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardSectionTag, { color: '#F59E0B' }]}>SIN SENSOR ACTIVO</Text>
                  <Text style={{ color: '#F59E0B', fontSize: 10, fontFamily: 'monospace' }}>DESCONECTADO</Text>
                </View>
                <Text style={styles.noDeviceSub}>
                  No hay ninguna banda de frecuencia cardíaca o pod de carrera conectado.
                </Text>
                <TouchableOpacity
                  style={styles.limeButton}
                  onPress={() => { setConnectSubTab('radar'); handleStartScan(); }}
                >
                  <Text style={styles.limeButtonText}>BUSCAR SENSORES BLE CERCANOS</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUB-TABS: MIS SENSORES / POOL / RADAR */}
            <View style={styles.subTabsContainer}>
              <TouchableOpacity
                style={[styles.subTabItem, connectSubTab === 'mis_sensores' && styles.subTabItemActive]}
                onPress={() => setConnectSubTab('mis_sensores')}
              >
                <Text style={[styles.subTabItemText, connectSubTab === 'mis_sensores' && styles.subTabItemTextActive]}>
                  Mis Sensores ({devices.filter(d => !d.is_coach_owned).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabItem, connectSubTab === 'pool' && styles.subTabItemActive]}
                onPress={() => setConnectSubTab('pool')}
              >
                <Text style={[styles.subTabItemText, connectSubTab === 'pool' && styles.subTabItemTextActive]}>
                  Pool del Club ({devices.filter(d => d.is_coach_owned).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabItem, connectSubTab === 'radar' && styles.subTabItemActive]}
                onPress={() => setConnectSubTab('radar')}
              >
                <Text style={[styles.subTabItemText, connectSubTab === 'radar' && styles.subTabItemTextActive]}>
                  Radar BLE 📡
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB CONTENT 1: MIS SENSORES */}
            {connectSubTab === 'mis_sensores' && (
              <View style={{ gap: 10 }}>
                {devices.filter((d) => !d.is_coach_owned).map((dev) => {
                  const isCurrent = connectedDevice?.id === dev.id;
                  return (
                    <View key={dev.id} style={[styles.deviceCard, isCurrent && { borderColor: '#CCFF00' }]}>
                      <View style={styles.deviceCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.brandBadge, { backgroundColor: '#CCFF00' }]}>
                            <Text style={styles.brandBadgeText}>{dev.brand.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.deviceCardTitle}>{dev.name}</Text>
                        </View>
                        <Text style={styles.deviceBatteryText}>🔋 {dev.battery_level}%</Text>
                      </View>
                      <Text style={styles.deviceCardMeta}>
                        Tipo: {dev.type === 'heart_rate' ? 'Banda Cardíaca' : 'Pod de Carrera'} • {dev.model}
                      </Text>
                      <View style={styles.deviceActionRow}>
                        {isCurrent ? (
                          <TouchableOpacity style={styles.connectedBadgeBtn} disabled>
                            <Text style={styles.connectedBadgeText}>✓ CONECTADO</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.connectSmallBtn}
                            onPress={() => handleConnectDevice(dev)}
                          >
                            <Text style={styles.connectSmallBtnText}>CONECTAR</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB CONTENT 2: POOL DEL CLUB */}
            {connectSubTab === 'pool' && (
              <View style={{ gap: 10 }}>
                <View style={styles.infoBanner}>
                  <Text style={styles.infoBannerText}>
                    Dispositivos de alta precisión prestados por el entrenador de Puerto Tejada Runners.
                  </Text>
                </View>
                {devices.filter((d) => d.is_coach_owned).map((dev) => {
                  const isCurrent = connectedDevice?.id === dev.id;
                  return (
                    <View key={dev.id} style={[styles.deviceCard, isCurrent && { borderColor: '#00F0FF' }]}>
                      <View style={styles.deviceCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.brandBadge, { backgroundColor: '#00F0FF' }]}>
                            <Text style={[styles.brandBadgeText, { color: '#000000' }]}>{dev.brand.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.deviceCardTitle}>{dev.name}</Text>
                        </View>
                        <Text style={styles.deviceBatteryText}>🔋 {dev.battery_level}%</Text>
                      </View>
                      <Text style={styles.deviceCardMeta}>
                        Inventario Club • Serial: {dev.serial_number || 'N/A'} • {dev.model}
                      </Text>
                      <View style={styles.deviceActionRow}>
                        {isCurrent ? (
                          <TouchableOpacity style={styles.connectedBadgeBtn} disabled>
                            <Text style={styles.connectedBadgeText}>✓ EN USO</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.connectSmallBtn, { backgroundColor: '#00F0FF' }]}
                            onPress={() => handleConnectDevice(dev)}
                          >
                            <Text style={[styles.connectSmallBtnText, { color: '#000000' }]}>USAR EN MI SESIÓN</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB CONTENT 3: RADAR BLE */}
            {connectSubTab === 'radar' && (
              <View style={{ gap: 12 }}>
                <View style={styles.radarCard}>
                  <Text style={styles.cardSectionTag}>RADAR BLUETOOTH BLE</Text>
                  <Text style={styles.radarDesc}>
                    Escanea periféricos cercanos estándar GATT (0x180D Frecuencia Cardíaca, 0x180F Batería, 0x1814 RSC Pod).
                  </Text>
                  <TouchableOpacity
                    style={styles.radarScanBtn}
                    onPress={handleStartScan}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator color="#000000" size="small" />
                        <Text style={styles.radarScanBtnText}>BUSCANDO PERIFÉRICOS…</Text>
                      </View>
                    ) : (
                      <Text style={styles.radarScanBtnText}>📡 INICIAR ESCANEO BLE</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.cardSectionTag, { marginTop: 4 }]}>DISPOSITIVOS DETECTADOS</Text>
                {radarList.map((dev) => (
                  <View key={dev.id} style={styles.radarItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceCardTitle}>{dev.name}</Text>
                      <Text style={styles.deviceCardMeta}>Señal: {dev.rssi || -60} dBm • {dev.brand}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.pairBtn}
                      onPress={() => {
                        handleConnectDevice(dev);
                        setDevices((prev) => [dev, ...prev.filter((d) => d.id !== dev.id)]);
                      }}
                    >
                      <Text style={styles.pairBtnText}>EMPAREJAR</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

          </View>
        )}

        {/* TAB 3: ANÁLISIS (RENDIMIENTO) */}
        {activeTab === 'analisis' && (
          <View style={styles.viewContent}>
            <Text style={styles.greetingTitle}>Centro de Rendimiento</Text>
            <Text style={styles.greetingSub}>Evolución Longitudinal & Radar</Text>

            <View style={styles.card}>
              <Text style={styles.cardSectionTag}>EVOLUCIÓN EN 12 MESES</Text>
              <View style={styles.comparisonRow}>
                <Text style={styles.compLabel}>Ritmo Umbral:</Text>
                <Text style={styles.compVal}>5:42/km → <Text style={{ color: '#CCFF00' }}>4:58/km</Text></Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.compLabel}>VO2 Max:</Text>
                <Text style={styles.compVal}>46 → <Text style={{ color: '#00F0FF' }}>52.4</Text></Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.compLabel}>Cadencia:</Text>
                <Text style={styles.compVal}>166 → <Text style={{ color: '#CCFF00' }}>178 spm</Text></Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardSectionTag}>RUNOVA PERFORMANCE RADAR</Text>
              <Text style={styles.radarScore}>86.4 / 100</Text>
              <Text style={styles.radarSub}>Score Multidimensional sin Sesgo</Text>
            </View>
          </View>
        )}

        {/* TAB 4: PERFIL (FICHA TÉCNICA) */}
        {activeTab === 'perfil' && (
          <View style={styles.viewContent}>
            <Text style={styles.greetingTitle}>Ficha Técnica del Corredor</Text>
            <Text style={styles.greetingSub}>
              {athlete?.full_name || 'Juan David Riascos'} • {athlete?.level || 'Avanzado'}
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardSectionTag}>VO2 MAX VERIFICADO</Text>
              <Text style={styles.vo2Big}>{athlete?.vo2_max || 52.4} <Text style={styles.vo2Unit}>ml/kg/min</Text></Text>
              <Text style={styles.vo2Source}>Fuente: {athlete?.vo2_max_source || 'Garmin Forerunner 965'}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardSectionTag}>5 ZONAS CARDÍACAS (KARVONEN)</Text>
              <Text style={styles.zoneText}>Z1 Recuperación: {athlete?.hr_zones?.zone1 ? `${athlete.hr_zones.zone1.min}–${athlete.hr_zones.zone1.max}` : '110–134'} bpm</Text>
              <Text style={styles.zoneText}>Z2 Aeróbica: {athlete?.hr_zones?.zone2 ? `${athlete.hr_zones.zone2.min}–${athlete.hr_zones.zone2.max}` : '135–153'} bpm</Text>
              <Text style={styles.zoneText}>Z3 Tempo: {athlete?.hr_zones?.zone3 ? `${athlete.hr_zones.zone3.min}–${athlete.hr_zones.zone3.max}` : '154–168'} bpm</Text>
              <Text style={styles.zoneText}>Z4 Umbral: {athlete?.hr_zones?.zone4 ? `${athlete.hr_zones.zone4.min}–${athlete.hr_zones.zone4.max}` : '169–181'} bpm</Text>
              <Text style={styles.zoneText}>Z5 Máxima: {athlete?.hr_zones?.zone5 ? `${athlete.hr_zones.zone5.min}–${athlete.hr_zones.zone5.max}` : '182–194'} bpm</Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* PLUS ACTION SHEET MODAL */}
      <Modal visible={isPlusOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>ACCIONES RÁPIDAS</Text>
            
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => { setIsPlusOpen(false); setActiveTab('entrenar'); }}
            >
              <Text style={[styles.sheetActionText, { color: '#CCFF00' }]}>▶ Nueva Carrera (RUNOVA LIVE)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => { setIsPlusOpen(false); setActiveTab('connect'); }}
            >
              <Text style={[styles.sheetActionText, { color: '#00F0FF' }]}>⚡ RUNOVA CONNECT (Vincular Sensores)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => { setIsPlusOpen(false); setActiveTab('analisis'); }}
            >
              <Text style={styles.sheetActionText}>📊 Centro de Rendimiento & Radar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => { setIsPlusOpen(false); alert('Importar FIT/GPX'); }}
            >
              <Text style={styles.sheetActionText}>☁️ Importar Actividad FIT/GPX</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => { setIsPlusOpen(false); alert('Registro manual'); }}
            >
              <Text style={styles.sheetActionText}>📝 Registrar Actividad Manual</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setIsPlusOpen(false)}
            >
              <Text style={styles.closeModalText}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MOBILE BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setActiveTab('inicio')}
        >
          <Text style={[styles.navText, activeTab === 'inicio' && styles.navActive]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setActiveTab('entrenar')}
        >
          <Text style={[styles.navText, activeTab === 'entrenar' && styles.navActive]}>Entrenar</Text>
        </TouchableOpacity>

        {/* Center Plus (+) Button */}
        <TouchableOpacity
          style={styles.plusBtn}
          onPress={() => setIsPlusOpen(true)}
        >
          <Text style={styles.plusBtnText}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setActiveTab('connect')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {connectedDevice && <View style={styles.navGreenDot} />}
            <Text style={[styles.navText, activeTab === 'connect' && styles.navActive]}>Connect</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setActiveTab('perfil')}
        >
          <Text style={[styles.navText, activeTab === 'perfil' && styles.navActive]}>Perfil</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08090D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  headerSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  logoutPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoutText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  mainScroll: {
    paddingBottom: 90,
  },
  viewContent: {
    padding: 16,
    gap: 16,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  greetingSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: -8,
  },
  card: {
    backgroundColor: '#0E1118',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionTag: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  tagGreen: {
    fontSize: 10,
    color: '#10B981',
    fontFamily: 'monospace',
  },
  tagTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  bigScore: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#CCFF00',
    fontFamily: 'monospace',
  },
  scoreSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  barGroup: {
    marginTop: 6,
  },
  barLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  barBg: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  workoutHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  workoutPace: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  limeButton: {
    backgroundColor: '#CCFF00',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  limeButtonText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  statUnit: {
    fontSize: 9,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  // RUNOVA LIVE styles
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveBadgeText: {
    color: '#CCFF00',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  liveBigRow: {
    flexDirection: 'row',
    gap: 10,
  },
  liveHeroCard: {
    flex: 1,
    backgroundColor: '#0E1118',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  liveHeroLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  liveGiantNum: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginVertical: 4,
  },
  liveGiantUnit: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  liveSplitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  liveSmallCard: {
    flex: 1,
    backgroundColor: '#0E1118',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  liveSmallLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  liveSmallNum: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  nextBlockCard: {
    backgroundColor: '#0E1118',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00F0FF',
    gap: 4,
  },
  nextBlockTag: {
    fontSize: 9,
    color: '#00F0FF',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  nextBlockTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  nextBlockSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  liveControlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pauseBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  pauseBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  finishBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  // Comparison & Perfil styles
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  compLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  compVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  radarScore: {
    fontSize: 36,
    fontWeight: '900',
    color: '#A855F7',
    fontFamily: 'monospace',
  },
  radarSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  vo2Big: {
    fontSize: 40,
    fontWeight: '900',
    color: '#00F0FF',
    fontFamily: 'monospace',
  },
  vo2Unit: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'normal',
  },
  vo2Source: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  zoneText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontFamily: 'monospace',
    paddingVertical: 2,
  },
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#08090D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  navBtn: {
    alignItems: 'center',
  },
  navText: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  navActive: {
    color: '#CCFF00',
    fontWeight: 'bold',
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  plusBtnText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '900',
  },
  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0E1118',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 11,
    color: '#CCFF00',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sheetAction: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sheetActionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  closeModalBtn: {
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  // Auth Screen styles
  authScroll: {
    padding: 24,
    alignItems: 'center',
  },
  authLogoContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginTop: 4,
  },
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    marginTop: 12,
  },
  dbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dbText: {
    color: '#94A3B8',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  authCard: {
    width: '100%',
    backgroundColor: '#0E1118',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  authHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#08090D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#CCFF00',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  demoBypassButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  demoBypassText: {
    color: '#00F0FF',
    fontSize: 11,
    fontFamily: 'monospace',
    textDecorationLine: 'underline',
  },
  switchAuthText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#F87171',
    fontSize: 11,
    fontFamily: 'monospace',
  },

  // ── RUNOVA CONNECT STYLES ──
  headerConnectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerConnectText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  homeSensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    marginTop: 4,
  },
  homeSensorText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  connectHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bleGattBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(204,255,0,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFF00',
  },
  bleGattBadgeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#CCFF00',
  },
  heroSensorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  heroSensorModel: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  heroSensorSerial: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  heroLiveHrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,77,38,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4D26',
  },
  heroLiveHrNum: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF4D26',
    fontFamily: 'monospace',
  },
  heroLiveHrLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FF4D26',
    fontFamily: 'monospace',
  },
  batteryRow: {
    marginTop: 10,
  },
  batteryLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  batteryPercent: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#CCFF00',
    fontFamily: 'monospace',
  },
  batteryBarBg: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  batteryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  disconnectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF4D26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectBtnText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#FF4D26',
  },
  noDeviceSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
    lineHeight: 18,
    marginVertical: 4,
  },
  subTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subTabItemActive: {
    backgroundColor: 'rgba(204,255,0,0.1)',
    borderColor: '#CCFF00',
  },
  subTabItemText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#94A3B8',
  },
  subTabItemTextActive: {
    color: '#CCFF00',
    fontWeight: 'bold',
  },
  deviceCard: {
    backgroundColor: '#0E1118',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#000000',
  },
  deviceCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  deviceBatteryText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  deviceCardMeta: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  deviceActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  connectedBadgeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(204,255,0,0.15)',
    borderWidth: 1,
    borderColor: '#CCFF00',
  },
  connectedBadgeText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#CCFF00',
  },
  connectSmallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#CCFF00',
  },
  connectSmallBtnText: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#000000',
  },
  infoBanner: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,240,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
  },
  infoBannerText: {
    fontSize: 11,
    color: '#00F0FF',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  radarCard: {
    backgroundColor: '#0E1118',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  radarDesc: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  radarScanBtn: {
    backgroundColor: '#CCFF00',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  radarScanBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  radarItemCard: {
    backgroundColor: '#0E1118',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pairBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(204,255,0,0.15)',
    borderWidth: 1,
    borderColor: '#CCFF00',
  },
  pairBtnText: {
    color: '#CCFF00',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  navGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CCFF00',
  },
});
