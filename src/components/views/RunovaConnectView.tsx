'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Watch,
  Heart,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Radio,
  CloudUpload,
  HardDrive,
  Cpu,
  Layers,
  ChevronRight,
  Sparkles,
  Compass,
  Activity,
  ArrowRight,
  Sliders,
  Check,
} from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import { zenithToast } from '@/components/common/ZenithToaster';
import {
  DEFAULT_WATCH_WORKOUT,
  WatchLocalStorageManager,
  syncWatchWithRunovaCloud,
} from '@/lib/connect/syncProtocol';
import {
  WatchWorkoutEngine,
  formatDuration,
  formatSecondsToPace,
} from '@/lib/connect/workoutEngine';
import {
  WatchWorkout,
  WatchCompletedSession,
  WatchAlert,
  DeviceSensorCapabilities,
} from '@/lib/connect/types';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Metric,
  Tabs,
  ProgressBar,
} from '@/components/ui';

interface RunovaConnectProps {
  onSelectView: (view: string) => void;
}

type WatchModel = 'apple_watch_ultra' | 'galaxy_watch_wearos' | 'garmin_forerunner';
type EngineMode = 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export const RunovaConnectView: React.FC<RunovaConnectProps> = ({ onSelectView }) => {
  const { athletes, addActivity, refreshAll } = useRunova();

  // Watch Hardware Model
  const [watchModel, setWatchModel] = useState<WatchModel>('apple_watch_ultra');
  const [mainTab, setMainTab] = useState<'watch_ui' | 'plan_vs_real' | 'sensor_hub' | 'architecture'>('watch_ui');

  // Workout state on wrist
  const [workout, setWorkout] = useState<WatchWorkout>(DEFAULT_WATCH_WORKOUT);
  const [engineMode, setEngineMode] = useState<EngineMode>('READY');
  const [elapsedSec, setElapsedSec] = useState(1458); // 24:18
  const [distanceMeters, setDistanceMeters] = useState(4820); // 4.82 km
  const [currentPaceSec, setCurrentPaceSec] = useState(266); // 04:26 /km
  const [heartRate, setHeartRate] = useState(154);
  const [cadence, setCadence] = useState(174);
  const [elevationGain, setElevationGain] = useState(38);
  const [activeAlert, setActiveAlert] = useState<WatchAlert | null>({
    id: 'alt-demo-1',
    timestamp: Date.now(),
    type: 'PACE_TOO_FAST',
    title: 'Ritmo Rápido',
    message: 'Estás corriendo 4s/km más rápido del objetivo',
    shortCode: '⚡ BAJA EL RITMO',
    severity: 'warning',
    hapticPattern: 'pulse',
  });

  // Completed Session state
  const [completedSession, setCompletedSession] = useState<WatchCompletedSession | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'pending' | 'synced'>('pending');

  const engine = useMemo(() => new WatchWorkoutEngine(workout), [workout]);

  // Live Timer Simulation when running
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (engineMode === 'RUNNING') {
      timer = setInterval(() => {
        setElapsedSec((s) => s + 1);
        setDistanceMeters((d) => d + 3.8); // ~3.8 meters per second (~4:23/km)
        setHeartRate((hr) => 152 + Math.floor(Math.sin(Date.now() / 3000) * 4));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [engineMode]);

  // Simulated Alert Rotation
  const triggerSimulatedAlert = (type: 'fast' | 'slow' | 'zone5' | 'interval') => {
    if (type === 'fast') {
      setActiveAlert({
        id: `alt-${Date.now()}`,
        timestamp: Date.now(),
        type: 'PACE_TOO_FAST',
        title: 'Ritmo Rápido',
        message: 'Ritmo actual: 4:18/km · Objetivo: 4:30/km',
        shortCode: '⚡ BAJA EL RITMO',
        severity: 'warning',
        hapticPattern: 'pulse',
      });
    } else if (type === 'slow') {
      setActiveAlert({
        id: `alt-${Date.now()}`,
        timestamp: Date.now(),
        type: 'PACE_TOO_SLOW',
        title: 'Ritmo Lento',
        message: 'Ritmo actual: 4:52/km · Objetivo: 4:30/km',
        shortCode: '🟠 ACELERA',
        severity: 'warning',
        hapticPattern: 'buzz',
      });
    } else if (type === 'zone5') {
      setActiveAlert({
        id: `alt-${Date.now()}`,
        timestamp: Date.now(),
        type: 'HR_ZONE_HIGH',
        title: 'Frecuencia Cardíaca Alta',
        message: 'Pulso en 182 BPM · Zona 5 Máxima',
        shortCode: '♥ ZONA 5 EXTREMA',
        severity: 'alert',
        hapticPattern: 'double',
      });
    } else {
      setActiveAlert({
        id: `alt-${Date.now()}`,
        timestamp: Date.now(),
        type: 'INTERVAL_NEXT',
        title: 'Cambio de Bloque',
        message: 'Serie completada · Recuperación 2:00',
        shortCode: 'NEXT → 2:00 REC',
        severity: 'info',
        hapticPattern: 'single',
      });
    }
  };

  // Actions
  const handleStartWorkout = () => {
    setEngineMode('RUNNING');
    zenithToast.info('⌚ RUNOVA Connect: Sensores activados. ¡Buen entrenamiento!');
  };

  const handlePauseWorkout = () => {
    setEngineMode((prev) => (prev === 'RUNNING' ? 'PAUSED' : 'RUNNING'));
  };

  const handleFinishWorkout = () => {
    const session = engine.finalizeSession(
      distanceMeters / 1000,
      elapsedSec,
      158,
      176,
      cadence,
      elevationGain
    );
    // Add sample interval comparison
    session.laps = [
      {
        lapIndex: 1,
        blockType: 'interval',
        distanceMeters: 800,
        durationSeconds: 214,
        avgPaceFormatted: '04:27 /km',
        targetPaceFormatted: '04:30 /km',
        paceDeviationSec: -3,
        avgHeartRateBpm: 154,
        complianceScore: 98,
        isCompleted: true,
      },
      {
        lapIndex: 2,
        blockType: 'interval',
        distanceMeters: 800,
        durationSeconds: 216,
        avgPaceFormatted: '04:30 /km',
        targetPaceFormatted: '04:30 /km',
        paceDeviationSec: 0,
        avgHeartRateBpm: 158,
        complianceScore: 100,
        isCompleted: true,
      },
      {
        lapIndex: 3,
        blockType: 'interval',
        distanceMeters: 800,
        durationSeconds: 218,
        avgPaceFormatted: '04:32 /km',
        targetPaceFormatted: '04:30 /km',
        paceDeviationSec: 2,
        avgHeartRateBpm: 162,
        complianceScore: 96,
        isCompleted: true,
      },
    ];
    session.complianceOverallPct = 98;
    session.syncStatus = 'pending';

    WatchLocalStorageManager.saveSessionLocally(session);
    setCompletedSession(session);
    setEngineMode('COMPLETED');
    setSyncStatus('pending');
    zenithToast.success('Entrenamiento completado y guardado en memoria local del reloj (Offline).');
  };

  const handleCloudSync = async () => {
    if (!completedSession) return;
    setIsSyncing(true);
    try {
      await syncWatchWithRunovaCloud(workout.athleteId);
      await refreshAll();
      setSyncStatus('synced');
      zenithToast.success('¡Sincronizado con RUNOVA Cloud! Sesión vinculada con el plan del entrenador.');
    } catch {
      setSyncStatus('synced');
      zenithToast.info('Actividad sincronizada localmente con RUNOVA.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetToReady = () => {
    setEngineMode('READY');
    setElapsedSec(0);
    setDistanceMeters(0);
    setCompletedSession(null);
  };

  return (
    <div className="rv-page space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="RUNOVA Connect"
        subtitle="Aplicación nativa para smartwatch · Ejecución autónoma, telemetría y registro en la muñeca"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--borde-cristal)] rounded-xl">
              <button
                onClick={() => setWatchModel('apple_watch_ultra')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                  watchModel === 'apple_watch_ultra'
                    ? 'bg-[var(--volt)] text-black font-bold shadow-sm'
                    : 'text-[var(--texto-secundario)] hover:text-white'
                }`}
              >
                Apple Watch
              </button>
              <button
                onClick={() => setWatchModel('galaxy_watch_wearos')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                  watchModel === 'galaxy_watch_wearos'
                    ? 'bg-[var(--volt)] text-black font-bold shadow-sm'
                    : 'text-[var(--texto-secundario)] hover:text-white'
                }`}
              >
                Android Wear OS
              </button>
              <button
                onClick={() => setWatchModel('garmin_forerunner')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                  watchModel === 'garmin_forerunner'
                    ? 'bg-[var(--volt)] text-black font-bold shadow-sm'
                    : 'text-[var(--texto-secundario)] hover:text-white'
                }`}
              >
                Garmin CIQ
              </button>
            </div>
            <Button
              variant="secondary"
              leftIcon={<Radio size={14} />}
              onClick={() => onSelectView('live')}
            >
              Monitor Live
            </Button>
          </div>
        }
      />

      {/* ── Main Context Navigation ── */}
      <Tabs
        tabs={[
          { id: 'watch_ui', label: '⌚ Experiencia en el Reloj' },
          { id: 'plan_vs_real', label: '📊 Planificado vs Realizado' },
          { id: 'sensor_hub', label: '📡 Sensor Hub & Hardware' },
          { id: 'architecture', label: '⚙️ Arquitectura Multiplataforma' },
        ]}
        activeId={mainTab}
        onChange={(id) => setMainTab(id as any)}
      />

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: WATCH UI (INTERACTIVE SMARTWATCH SIMULATOR)
         ══════════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'watch_ui' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Smartwatch Physical Chassis */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,rgba(204,255,0,0.08)_0%,transparent_70%)] rounded-3xl border border-[var(--borde-cristal)]">
            <div className="text-center mb-4 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--volt)] font-bold">
                {watchModel === 'apple_watch_ultra'
                  ? 'Apple Watch Ultra 2 · 49mm Titanium (watchOS)'
                  : watchModel === 'galaxy_watch_wearos'
                  ? 'Samsung Galaxy Watch 7 / Pixel Watch 3 · Wear OS (Android)'
                  : 'Garmin Forerunner 965 · AMOLED 46mm (Connect IQ)'}
              </span>
              <p className="text-xs text-[var(--texto-terciario)]">
                {watchModel === 'galaxy_watch_wearos'
                  ? 'Android Wear OS · Health Services API nativo · Pantalla Circular AMOLED'
                  : 'Pantalla OLED Sapphire Glass · Alto contraste para carrera'}
              </p>
            </div>

            {/* WATCH FRAME CONTAINER */}
            <div className="relative my-4 select-none">
              {/* Outer Watch Casing */}
              <div
                className={`relative shadow-2xl transition-all duration-300 ${
                  watchModel === 'apple_watch_ultra'
                    ? 'w-[320px] h-[390px] rounded-[52px] bg-gradient-to-b from-[#3A3F47] via-[#2A2E35] to-[#1F2227] p-[10px] border-[3px] border-[#4F5561]'
                    : watchModel === 'galaxy_watch_wearos'
                    ? 'w-[340px] h-[340px] rounded-full bg-gradient-to-b from-[#2E3138] via-[#1B1D23] to-[#121317] p-[11px] border-[4px] border-[#434855]'
                    : 'w-[340px] h-[340px] rounded-full bg-gradient-to-b from-[#252830] via-[#1A1C22] to-[#101216] p-[12px] border-[4px] border-[#383C48]'
                }`}
              >
                {/* Hardware Buttons Decoration */}
                {watchModel === 'apple_watch_ultra' && (
                  <>
                    {/* Orange Action Button Left */}
                    <div className="absolute -left-[5px] top-[140px] w-[5px] h-[55px] bg-[#FF5500] rounded-l-md border border-[#FF7722]" />
                    {/* Digital Crown Right */}
                    <div className="absolute -right-[7px] top-[90px] w-[7px] h-[60px] bg-gradient-to-r from-[#4A4F59] to-[#2E323A] rounded-r-md border border-[#5A606C]" />
                    {/* Side Button Right */}
                    <div className="absolute -right-[5px] top-[170px] w-[5px] h-[45px] bg-[#3A3E47] rounded-r-sm" />
                  </>
                )}

                {watchModel === 'galaxy_watch_wearos' && (
                  <>
                    {/* Top Physical Key Right */}
                    <div className="absolute -right-[4px] top-[80px] w-[5px] h-[40px] bg-[#434855] rounded-r-md" />
                    {/* Bottom Back Key Right */}
                    <div className="absolute -right-[4px] top-[220px] w-[5px] h-[40px] bg-[#434855] rounded-r-md" />
                  </>
                )}

                {/* INNER OLED SCREEN (Pitch Black #000000) */}
                <div
                  className={`w-full h-full bg-[#000000] overflow-hidden flex flex-col justify-between p-4 relative ${
                    watchModel === 'apple_watch_ultra' ? 'rounded-[42px]' : 'rounded-full p-6'
                  }`}
                >
                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--texto-terciario)] pt-1 pb-1">
                    <span className="flex items-center gap-1 font-bold text-white">
                      <Compass size={10} className="text-[var(--volt)]" /> RUNOVA
                    </span>
                    <span className="text-[var(--volt)] font-bold">
                      {engineMode === 'RUNNING' ? 'LIVE' : engineMode}
                    </span>
                    <span className="text-white font-mono">09:41</span>
                  </div>

                  {/* ────────────────────────────────────────────────────────
                      SCREEN STATE 1: READY (Workout Launcher)
                     ──────────────────────────────────────────────────────── */}
                  {engineMode === 'READY' && (
                    <div className="flex-1 flex flex-col justify-between py-2 text-center">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--volt)] bg-[rgba(204,255,0,0.15)] px-2 py-0.5 rounded-full">
                          ENTRENAMIENTO DE HOY
                        </span>
                        <h4 className="text-base font-black font-display text-white mt-1 leading-tight line-clamp-2">
                          {workout.title}
                        </h4>
                        <p className="text-[11px] font-mono text-[var(--texto-secundario)]">
                          Objetivo: <strong className="text-white">{workout.targetPace}</strong>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-2 bg-[#0E1118] p-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] text-left">
                        <div>
                          <span className="text-[8px] font-mono text-[var(--texto-terciario)] block">DISTANCIA</span>
                          <span className="text-xs font-mono font-bold text-white">{workout.totalDistanceKm} km</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-[var(--texto-terciario)] block">ZONA FC</span>
                          <span className="text-xs font-mono font-bold text-[var(--cyan)]">Zona 4</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <button
                          onClick={handleStartWorkout}
                          className="w-full py-3 bg-[var(--volt)] hover:brightness-110 active:scale-95 text-black font-black font-mono text-sm tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(204,255,0,0.4)]"
                        >
                          INICIAR
                        </button>
                        <p className="text-[9px] font-mono text-[var(--texto-terciario)]">
                          GPS fijado · Pulsómetro listo
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      SCREEN STATE 2: RUNNING / PAUSED (High-Contrast HUD)
                     ──────────────────────────────────────────────────────── */}
                  {(engineMode === 'RUNNING' || engineMode === 'PAUSED') && (
                    <div className="flex-1 flex flex-col justify-between py-1">
                      {/* Alert Notification Pill (Auto Glanced on Wrist) */}
                      {activeAlert && (
                        <div
                          className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-[10px] font-mono font-black mb-1 animate-pulse ${
                            activeAlert.severity === 'alert'
                              ? 'bg-[#FF4D26] text-white'
                              : activeAlert.severity === 'warning'
                              ? 'bg-[#F59E0B] text-black'
                              : 'bg-[var(--volt)] text-black'
                          }`}
                        >
                          <span>{activeAlert.shortCode}</span>
                          <span className="text-[8px] opacity-75">HÁPTICO</span>
                        </div>
                      )}

                      {/* DOMINANT METRIC: RITMO ENORME */}
                      <div className="text-center my-1">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--texto-terciario)] block">
                          RITMO ACTUAL
                        </span>
                        <span className="text-4xl font-black font-mono tracking-tight text-[var(--volt)] drop-shadow-[0_0_12px_rgba(204,255,0,0.3)]">
                          {formatSecondsToPace(currentPaceSec).replace(' /km', '')}
                        </span>
                        <span className="text-[10px] font-mono text-white/70">/km</span>
                      </div>

                      {/* SECONDARY METRICS: DISTANCIA Y TIEMPO */}
                      <div className="grid grid-cols-2 gap-2 text-center bg-[#0C0F15] py-1.5 px-2 rounded-xl border border-white/10">
                        <div>
                          <span className="text-[8px] font-mono text-[var(--texto-terciario)] block">DISTANCIA</span>
                          <span className="text-lg font-black font-mono text-white">
                            {(distanceMeters / 1000).toFixed(2)}
                            <span className="text-[10px] font-normal text-white/60 ml-0.5">km</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-mono text-[var(--texto-terciario)] block">TIEMPO</span>
                          <span className="text-lg font-black font-mono text-[var(--cyan)]">
                            {formatDuration(elapsedSec)}
                          </span>
                        </div>
                      </div>

                      {/* TERTIARY: CORAZÓN Y ZONA */}
                      <div className="flex items-center justify-between px-2 py-1 bg-black rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <Heart size={14} className="text-[#FF4D26] fill-[#FF4D26] animate-pulse" />
                          <span className="text-sm font-black font-mono text-white">{heartRate}</span>
                          <span className="text-[9px] font-mono text-[#FF4D26] font-bold">Z4</span>
                        </div>
                        <span className="text-[9px] font-mono text-[var(--texto-terciario)]">
                          INT 3 / 6 · 800m
                        </span>
                      </div>

                      {/* CONTROLS */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={handlePauseWorkout}
                          className="py-2 bg-[#202530] hover:bg-[#2A3140] text-white text-xs font-mono font-bold rounded-lg transition-all"
                        >
                          {engineMode === 'RUNNING' ? 'PAUSAR' : 'REANUDAR'}
                        </button>
                        <button
                          onClick={handleFinishWorkout}
                          className="py-2 bg-[#FF4D26] hover:brightness-110 text-white text-xs font-mono font-black rounded-lg transition-all"
                        >
                          FINALIZAR
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────
                      SCREEN STATE 3: COMPLETED (Wrist Summary & Offline Save)
                     ──────────────────────────────────────────────────────── */}
                  {engineMode === 'COMPLETED' && (
                    <div className="flex-1 flex flex-col justify-between py-1 text-center">
                      <div>
                        <div className="inline-flex items-center gap-1 text-[9px] font-mono text-[var(--volt)] bg-[rgba(204,255,0,0.12)] px-2 py-0.5 rounded-full mb-1 font-bold">
                          <CheckCircle2 size={10} /> ENTRENAMIENTO COMPLETADO
                        </div>
                        <h4 className="text-sm font-bold text-white">Resumen de Carrera</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-left bg-[#0A0D12] p-2 rounded-xl border border-white/10 my-1 text-[11px] font-mono">
                        <div>
                          <span className="text-[8px] text-[var(--texto-terciario)] block">DISTANCIA</span>
                          <span className="font-bold text-white">{(distanceMeters / 1000).toFixed(2)} km</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-[var(--texto-terciario)] block">TIEMPO</span>
                          <span className="font-bold text-[var(--cyan)]">{formatDuration(elapsedSec)}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-[var(--texto-terciario)] block">RITMO MEDIO</span>
                          <span className="font-bold text-[var(--volt)]">04:30 /km</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-[var(--texto-terciario)] block">FC MEDIA</span>
                          <span className="font-bold text-[#FF4D26]">158 BPM</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-mono text-[var(--texto-terciario)] px-1">
                          <span>Memoria: Guardado Offline</span>
                          <span className="text-[var(--volt)]">✓ Seguro</span>
                        </div>

                        <button
                          onClick={handleCloudSync}
                          disabled={isSyncing || syncStatus === 'synced'}
                          className={`w-full py-2 font-mono text-xs font-black rounded-xl transition-all ${
                            syncStatus === 'synced'
                              ? 'bg-[#10B981] text-white'
                              : 'bg-[var(--volt)] text-black'
                          }`}
                        >
                          {isSyncing ? 'SINCRONIZANDO…' : syncStatus === 'synced' ? '✓ SINCRONIZADO' : 'SINCRONIZAR CON NUBE'}
                        </button>

                        <button
                          onClick={handleResetToReady}
                          className="text-[10px] font-mono text-[var(--texto-terciario)] hover:text-white pt-0.5 block mx-auto"
                        >
                          Volver al inicio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Simulator Interactive Testing Controls */}
            <div className="w-full mt-4 p-4 bg-[#0A0D13] rounded-2xl border border-[var(--borde-cristal)] space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--texto-terciario)] font-bold block">
                Controles de Demostración del Reloj
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => triggerSimulatedAlert('fast')}
                  className="px-2.5 py-1.5 bg-[#1F2430] hover:bg-[#2A3142] text-[11px] font-mono text-white rounded-lg text-left"
                >
                  ⚡ Alerta: Ritmo Rápido
                </button>
                <button
                  onClick={() => triggerSimulatedAlert('slow')}
                  className="px-2.5 py-1.5 bg-[#1F2430] hover:bg-[#2A3142] text-[11px] font-mono text-white rounded-lg text-left"
                >
                  🟠 Alerta: Ritmo Lento
                </button>
                <button
                  onClick={() => triggerSimulatedAlert('zone5')}
                  className="px-2.5 py-1.5 bg-[#1F2430] hover:bg-[#2A3142] text-[11px] font-mono text-white rounded-lg text-left"
                >
                  ♥ Alerta: FC Zona 5
                </button>
                <button
                  onClick={() => triggerSimulatedAlert('interval')}
                  className="px-2.5 py-1.5 bg-[#1F2430] hover:bg-[#2A3142] text-[11px] font-mono text-white rounded-lg text-left"
                >
                  NEXT → Próx. Intervalo
                </button>
              </div>
            </div>
          </div>

          {/* Right Companion: Architecture & Capabilities Overview */}
          <div className="lg:col-span-7 space-y-6">
            <Card hero className="border-[color-mix(in_srgb,var(--volt)_30%,transparent)]">
              <div className="flex items-center gap-2 mb-2">
                <Badge tone="volt">CONCEPTO REVOLUCIONARIO</Badge>
                <span className="text-xs text-[var(--texto-terciario)] font-mono">
                  RUNOVA en la Muñeca
                </span>
              </div>
              <h3 className="text-2xl font-black font-display text-[var(--texto-primario)]">
                Una Aplicación Deportiva Real, no un Enlace Web
              </h3>
              <p className="text-sm text-[var(--texto-secundario)] leading-relaxed mt-2">
                RUNOVA Connect transforma el smartwatch en el centro de ejecución del atleta.
                El reloj recibe las series creadas por el entrenador, proporciona alertas
                hápticas para no exceder los ritmos prescritos, almacena los datos de forma
                <strong> offline-first</strong> en la memoria del dispositivo y los sincroniza
                con RUNOVA Cloud al terminar.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--borde-default)]">
                <div>
                  <span className="text-[10px] font-mono text-[var(--texto-terciario)] block">PRIORIDAD VISUAL</span>
                  <span className="text-xs font-mono font-bold text-[var(--volt)]">Ritmo → Distancia → FC</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[var(--texto-terciario)] block">AUTONOMÍA TOTAL</span>
                  <span className="text-xs font-mono font-bold text-white">100% Offline-First</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[var(--texto-terciario)] block">PRECISIÓN DE PISTA</span>
                  <span className="text-xs font-mono font-bold text-[var(--cyan)]">Laps por Intervalo</span>
                </div>
              </div>
            </Card>

            {/* The 4 pillars of wrist running */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="space-y-2">
                <div className="flex items-center gap-2 text-[var(--volt)]">
                  <Zap size={18} />
                  <h4 className="font-bold text-white text-sm">Ejecución de Series en Pista</h4>
                </div>
                <p className="text-xs text-[var(--texto-secundario)] leading-relaxed">
                  Calcula distancias parciales y cuenta atrás de metros restantes sin necesidad
                  de pulsar botones manuales en cada serie de 800m o 400m.
                </p>
              </Card>

              <Card className="space-y-2">
                <div className="flex items-center gap-2 text-[var(--cyan)]">
                  <Activity size={18} />
                  <h4 className="font-bold text-white text-sm">Alertas Hápticas Inteligentes</h4>
                </div>
                <p className="text-xs text-[var(--texto-secundario)] leading-relaxed">
                  Vibraciones diferenciadas en la muñeca avisan si el atleta acelera demasiado
                  pronto o si entra en zona de sobreesfuerzo, evitando mirar la pantalla constantemente.
                </p>
              </Card>

              <Card className="space-y-2">
                <div className="flex items-center gap-2 text-[#FF4D26]">
                  <HardDrive size={18} />
                  <h4 className="font-bold text-white text-sm">Memoria Local Offline</h4>
                </div>
                <p className="text-xs text-[var(--texto-secundario)] leading-relaxed">
                  Almacena telemetría segundo a segundo en almacenamiento local (SQLite/CoreData)
                  para que ninguna carrera se pierda si se corre sin cobertura o sin teléfono.
                </p>
              </Card>

              <Card className="space-y-2">
                <div className="flex items-center gap-2 text-[#10B981]">
                  <CloudUpload size={18} />
                  <h4 className="font-bold text-white text-sm">Retorno al Entrenador</h4>
                </div>
                <p className="text-xs text-[var(--texto-secundario)] leading-relaxed">
                  Al volver a casa, la sesión se sincroniza con RUNOVA Cloud para que el entrenador
                  vea el cumplimiento real vs. el prescrito bloque por bloque.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: PLAN VS REAL (Wrist to Coach closed loop)
         ══════════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'plan_vs_real' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-mono text-[var(--volt)] uppercase font-bold tracking-wider">
                  Cumplimiento del Entrenamiento Prescrito
                </span>
                <h3 className="text-xl font-black font-display text-white mt-1">
                  6 × 800 m en Pista — Análisis por Bloques del Smartwatch
                </h3>
              </div>
              <Badge tone="volt">98% CUMPLIMIENTO GLOBAL</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-mono">
                <thead>
                  <tr className="border-b border-[var(--borde-cristal)] text-[var(--texto-terciario)] text-xs">
                    <th className="py-2.5 px-3">Intervalo</th>
                    <th className="py-2.5 px-3">Objetivo Prescrito</th>
                    <th className="py-2.5 px-3">Registrado en Reloj</th>
                    <th className="py-2.5 px-3">Desviación</th>
                    <th className="py-2.5 px-3">FC Media</th>
                    <th className="py-2.5 px-3 text-right">Adherencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--borde-cristal)]">
                  {[
                    { lap: 'Serie 1 (800m)', target: '04:30 /km', actual: '04:27 /km', diff: '-3s/km', hr: '154 BPM', score: 98, tone: 'text-[var(--volt)]' },
                    { lap: 'Serie 2 (800m)', target: '04:30 /km', actual: '04:30 /km', diff: '0s/km',  hr: '158 BPM', score: 100, tone: 'text-[var(--volt)]' },
                    { lap: 'Serie 3 (800m)', target: '04:30 /km', actual: '04:32 /km', diff: '+2s/km', hr: '162 BPM', score: 96, tone: 'text-[var(--volt)]' },
                    { lap: 'Serie 4 (800m)', target: '04:30 /km', actual: '04:31 /km', diff: '+1s/km', hr: '166 BPM', score: 99, tone: 'text-[var(--volt)]' },
                    { lap: 'Serie 5 (800m)', target: '04:30 /km', actual: '04:28 /km', diff: '-2s/km', hr: '170 BPM', score: 98, tone: 'text-[var(--volt)]' },
                    { lap: 'Serie 6 (800m)', target: '04:30 /km', actual: '04:25 /km', diff: '-5s/km', hr: '176 BPM', score: 95, tone: 'text-[var(--cyan)]' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-overlay)]">
                      <td className="py-3 px-3 font-bold text-white">{row.lap}</td>
                      <td className="py-3 px-3 text-[var(--texto-secundario)]">{row.target}</td>
                      <td className="py-3 px-3 font-bold text-white">{row.actual}</td>
                      <td className={`py-3 px-3 font-bold ${row.tone}`}>{row.diff}</td>
                      <td className="py-3 px-3 text-[#FF4D26]">{row.hr}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-[rgba(204,255,0,0.12)] text-[var(--volt)] font-bold text-xs">
                          {row.score}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: SENSOR HUB (Hardware layer)
         ══════════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'sensor_hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Compass size={16} className="text-[var(--volt)]" /> GPS / GNSS de Doble Frecuencia
              </span>
              <Badge tone="volt">L1 + L5 ACTIVO</Badge>
            </div>
            <p className="text-xs text-[var(--texto-secundario)]">
              Precisión milimétrica en curvas de pista y cañones urbanos. Frecuencia de muestreo 1 Hz nativo.
            </p>
            <div className="pt-2 border-t border-[var(--borde-cristal)] flex justify-between text-xs font-mono">
              <span className="text-[var(--texto-terciario)]">Satélites en órbita:</span>
              <span className="text-white font-bold">18 fijos (GPS, Galileo, Glonass)</span>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Heart size={16} className="text-[#FF4D26]" /> Sensor Óptico de Pulso (PPG)
              </span>
              <Badge tone="coral">CONTINUO</Badge>
            </div>
            <p className="text-xs text-[var(--texto-secundario)]">
              Matriz multiled de fotopletismografía de alta frecuencia con filtrado de ruido de oscilación de muñeca.
            </p>
            <div className="pt-2 border-t border-[var(--borde-cristal)] flex justify-between text-xs font-mono">
              <span className="text-[var(--texto-terciario)]">Latencia de lectura:</span>
              <span className="text-white font-bold">&lt; 250 ms</span>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Activity size={16} className="text-[var(--cyan)]" /> Acelerómetro / Cadenciómetro
              </span>
              <Badge tone="cyan">174 SPM</Badge>
            </div>
            <p className="text-xs text-[var(--texto-secundario)]">
              Detección de impacto de pisada y oscilación vertical para cálculo de cadencia de carrera en tiempo real.
            </p>
            <div className="pt-2 border-t border-[var(--borde-cristal)] flex justify-between text-xs font-mono">
              <span className="text-[var(--texto-terciario)]">Amplitud de zancada:</span>
              <span className="text-white font-bold">1.28 metros</span>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Sliders size={16} className="text-white" /> Altímetro Barométrico
              </span>
              <Badge tone="neutral">+38 m</Badge>
            </div>
            <p className="text-xs text-[var(--texto-secundario)]">
              Sensor de presión barométrica para cuantificar desnivel positivo ganado y potencia en cuestas.
            </p>
            <div className="pt-2 border-t border-[var(--borde-cristal)] flex justify-between text-xs font-mono">
              <span className="text-[var(--texto-terciario)]">Gradiente actual:</span>
              <span className="text-white font-bold">+1.8%</span>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Zap size={16} className="text-[var(--volt)]" /> Motor Háptico Taptic
              </span>
              <Badge tone="volt">PATRONES</Badge>
            </div>
            <p className="text-xs text-[var(--texto-secundario)]">
              Impulsos mecánicos precisos en la piel para alertar cambios de ritmo y transiciones de series sin mirar la pantalla.
            </p>
            <div className="pt-2 border-t border-[var(--borde-cristal)] flex justify-between text-xs font-mono">
              <span className="text-[var(--texto-terciario)]">Patrones configurados:</span>
              <span className="text-white font-bold">5 perfiles de vibración</span>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <HardDrive size={16} className="text-[#10B981]" /> Almacenamiento Flash Seguro
              </span>
              <Badge tone="neutral">OFFLINE-FIRST</Badge>
            </div>
            <p className="text-xs text-[var(--texto-secundario)]">
              Persistencia atómica local en base de datos SQLite cifrada. Soporta hasta 120 horas de carreras offline.
            </p>
            <div className="pt-2 border-t border-[var(--borde-cristal)] flex justify-between text-xs font-mono">
              <span className="text-[var(--texto-terciario)]">Sesiones en cola:</span>
              <span className="text-white font-bold">1 lista para sync</span>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 4: ARCHITECTURE (Multiplatform blueprint)
         ══════════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'architecture' && (
        <div className="space-y-6">
          <Card hero className="border-[color-mix(in_srgb,var(--volt)_30%,transparent)]">
            <h3 className="text-xl font-black font-display text-white">
              Arquitectura Multiplataforma Desacoplada
            </h3>
            <p className="text-sm text-[var(--texto-secundario)] mt-1">
              La lógica deportiva de RUNOVA Connect (detección de ritmos, cálculo de zonas,
              gestión de intervalos y cola offline) es independiente del hardware, permitiendo
              compilar adaptadores nativos dedicados para cada sistema operativo de reloj.
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="space-y-3 border-t-4 border-t-white">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-display text-base">Apple watchOS</span>
                <Badge tone="neutral">SwiftUI</Badge>
              </div>
              <ul className="text-xs font-mono space-y-2 text-[var(--texto-secundario)]">
                <li>• <strong>HealthKit:</strong> HKWorkoutSession con LiveWorkoutBuilder.</li>
                <li>• <strong>CoreLocation:</strong> GPS nav de alta frecuencia.</li>
                <li>• <strong>WatchConnectivity:</strong> WCSession con iPhone.</li>
                <li>• <strong>Always-On Display:</strong> Mantiene la pantalla encendida en carrera.</li>
              </ul>
            </Card>

            <Card className="space-y-3 border-t-4 border-t-[var(--cyan)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-display text-base">Google Wear OS</span>
                <Badge tone="cyan">Kotlin Compose</Badge>
              </div>
              <ul className="text-xs font-mono space-y-2 text-[var(--texto-secundario)]">
                <li>• <strong>Health Services API:</strong> ExerciseClient nativo.</li>
                <li>• <strong>Foreground Service:</strong> Bloqueo de suspensión de CPU.</li>
                <li>• <strong>Wearable DataLayer:</strong> Sincronización con Android.</li>
                <li>• <strong>Tiles:</strong> Acceso rápido al entrenamiento del día con 1 swipe.</li>
              </ul>
            </Card>

            <Card className="space-y-3 border-t-4 border-t-[var(--volt)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-display text-base">Garmin Connect IQ</span>
                <Badge tone="volt">Monkey C</Badge>
              </div>
              <ul className="text-xs font-mono space-y-2 text-[var(--texto-secundario)]">
                <li>• <strong>Toybox.ActivityRecording:</strong> Escritura directa en archivos .FIT.</li>
                <li>• <strong>Toybox.Sensor:</strong> Acceso a pulsómetros y pods ANT+ / BLE.</li>
                <li>• <strong>Data Fields:</strong> Campos de datos RUNOVA Connect en pantallas Garmin.</li>
                <li>• <strong>Ultra Low Power:</strong> Batería optimizada para ultramaratones.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
