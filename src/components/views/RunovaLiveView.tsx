'use client';

import React, { useEffect, useState } from 'react';
import { Play, Pause, Square, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button, Badge, Metric, Modal, Card } from '@/components/ui';
import { useRunova } from '@/context/RunovaContext';

interface RunovaLiveProps {
  onFinishTraining: () => void;
  onExit: () => void;
}

export const RunovaLiveView: React.FC<RunovaLiveProps> = ({
  onFinishTraining,
  onExit,
}) => {
  const { selectedAthlete, athletes, todayWorkout, addActivity } = useRunova();
  const [isRunning, setIsRunning] = useState(true);
  const [locked, setLocked] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(1472);
  const [distanceKm, setDistanceKm] = useState(5.24);
  const [heartRate, setHeartRate] = useState(163);
  const [pace] = useState('4:41');
  const [cadence, setCadence] = useState(178);
  const [currentLap, setCurrentLap] = useState(5);
  const [isFinishedModal, setIsFinishedModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRunning && !isFinishedModal) {
      interval = setInterval(() => {
        setElapsedSec((prev) => {
          setDistanceKm((d) => Number((d + 0.0035).toFixed(3)));
          setHeartRate(160 + Math.floor(Math.random() * 6));
          setCadence(176 + Math.floor(Math.random() * 5));
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isFinishedModal]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFinish = () => {
    if (locked) return;
    setIsRunning(false);
    setIsFinishedModal(true);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C1F429', '#18FFC8', '#FF6D6D'],
    });
  };

  const handleSaveAndProceed = async () => {
    setIsSaving(true);
    try {
      const athId = selectedAthlete?.id || athletes[0]?.id;
      if (athId) {
        await addActivity({
          athlete_id: athId,
          workout_id: todayWorkout?.id || undefined,
          title: todayWorkout?.title ? `[Live] ${todayWorkout.title}` : 'Carrera Live Cockpit',
          start_time: new Date(Date.now() - elapsedSec * 1000).toISOString(),
          distance_km: Number(distanceKm.toFixed(2)),
          duration_sec: elapsedSec,
          avg_pace: pace,
          avg_heart_rate: heartRate,
          max_heart_rate: heartRate + 8,
          avg_cadence: cadence,
          format: 'LIVE',
          source_sync_id: `live-${Date.now()}-${athId}`,
        });
      }
    } catch (err) {
      console.warn('Error saving live activity:', err);
    } finally {
      setIsSaving(false);
      setIsFinishedModal(false);
      onFinishTraining();
    }
  };

  const guard = (fn: () => void) => {
    if (locked) return;
    fn();
  };

  return (
    <div className="min-h-screen bg-[var(--fondo)] text-[var(--texto-primario)] flex flex-col select-none relative">
      {/* Barra superior — siempre por encima del bloqueo */}
      <header className="relative z-50 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[var(--borde-default)] bg-[var(--fondo)]">
        <div className="flex items-center gap-3 min-w-0">
          <Badge tone="coral" pulse>
            LIVE
          </Badge>
          <span className="font-display font-bold tracking-wider text-sm sm:text-base truncate">
            RUNOVA LIVE
          </span>
          <span className="hidden sm:inline rv-caption">Vuelta {currentLap} · GPS</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={locked ? 'primary' : 'secondary'}
            size="sm"
            leftIcon={locked ? <Lock size={16} /> : <Unlock size={16} />}
            onClick={() => setLocked((v) => !v)}
            aria-pressed={locked}
            aria-label={locked ? 'Desbloquear pantalla' : 'Bloquear anti-toques'}
          >
            {locked ? 'Bloqueado' : 'Bloquear'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={locked}
            onClick={() => guard(onExit)}
          >
            Salir
          </Button>
        </div>
      </header>

      {/* Capa de bloqueo: tapa main + footer, no el header */}
      {locked && (
        <div
          className="rv-backdrop absolute inset-x-0 top-[65px] bottom-0 z-40"
          aria-hidden
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.preventDefault()}
        />
      )}

      <main
        className={`flex-1 flex flex-col justify-center px-4 sm:px-6 py-6 max-w-3xl mx-auto w-full space-y-6 ${
          locked ? 'pointer-events-none' : ''
        }`}
      >
        {/* 3 datos grandes: ritmo, tiempo, distancia */}
        <div className="grid grid-cols-1 gap-4">
          <Card hero padding="lg" className="text-center border-[color-mix(in_srgb,var(--cyan)_25%,transparent)]">
            <p className="rv-caption uppercase tracking-wider mb-2">Ritmo</p>
            <p className="rv-data text-6xl sm:text-7xl lg:text-8xl font-bold text-[var(--cyan)] leading-none tracking-tight">
              {pace}
              <span className="text-xl sm:text-2xl text-[var(--texto-terciario)] font-normal ml-2">
                /km
              </span>
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card padding="lg" className="text-center">
              <p className="rv-caption uppercase tracking-wider mb-2">Tiempo</p>
              <p className="rv-data text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--texto-primario)] leading-none tracking-tight">
                {formatTime(elapsedSec)}
              </p>
            </Card>
            <Card padding="lg" className="text-center">
              <p className="rv-caption uppercase tracking-wider mb-2">Distancia</p>
              <p className="rv-data text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--texto-primario)] leading-none tracking-tight">
                {distanceKm.toFixed(2)}
                <span className="text-base sm:text-lg text-[var(--texto-terciario)] font-normal ml-1">
                  km
                </span>
              </p>
            </Card>
          </div>
        </div>

        {/* Secundarias: FC + cadencia */}
        <div className="grid grid-cols-2 gap-4">
          <Card padding="md" className="text-center">
            <p className="rv-caption uppercase tracking-wider mb-1">FC</p>
            <p className="rv-data text-3xl sm:text-4xl font-bold text-[var(--coral)] leading-none">
              {heartRate}
              <span className="text-xs font-mono text-[var(--texto-terciario)] ml-1">bpm</span>
            </p>
            <p className="rv-caption mt-2">Zona 4 · Umbral</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="rv-caption uppercase tracking-wider mb-1">Cadencia</p>
            <p className="rv-data text-3xl sm:text-4xl font-bold text-[var(--texto-primario)] leading-none">
              {cadence}
              <span className="text-xs font-mono text-[var(--texto-terciario)] ml-1">spm</span>
            </p>
            <p className="rv-caption mt-2 text-[var(--volt)]">Objetivo 175+</p>
          </Card>
        </div>
      </main>

      {/* Controles enormes */}
      <footer
        className={`relative z-30 px-4 sm:px-6 pb-6 pt-4 border-t border-[var(--borde-default)] max-w-3xl mx-auto w-full ${
          locked ? 'pointer-events-none opacity-40' : ''
        }`}
      >
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="secondary"
            className="min-h-14 sm:min-h-16 text-xs sm:text-sm uppercase tracking-wider font-bold"
            onClick={() => guard(() => setCurrentLap((n) => n + 1))}
            disabled={locked}
          >
            Lap
          </Button>
          <Button
            variant="primary"
            className="min-h-14 sm:min-h-16 text-xs sm:text-sm uppercase tracking-wider font-bold"
            leftIcon={
              isRunning ? (
                <Pause size={20} className="fill-current" />
              ) : (
                <Play size={20} className="fill-current" />
              )
            }
            onClick={() => guard(() => setIsRunning((v) => !v))}
            disabled={locked}
          >
            {isRunning ? 'Pausar' : 'Reanudar'}
          </Button>
          <Button
            variant="danger"
            className="min-h-14 sm:min-h-16 text-xs sm:text-sm uppercase tracking-wider font-bold"
            leftIcon={<Square size={18} className="fill-current" />}
            onClick={handleFinish}
            disabled={locked}
          >
            Fin
          </Button>
        </div>
      </footer>

      <Modal
        open={isFinishedModal}
        onClose={() => setIsFinishedModal(false)}
        title="Sesión completada"
        size="sm"
        footer={
          <Button
            className="w-full min-h-12"
            disabled={isSaving}
            onClick={handleSaveAndProceed}
          >
            {isSaving ? 'Guardando en RUNOVA Cloud…' : 'Guardar y Ver Plan vs Real'}
          </Button>
        }
      >
        <div className="space-y-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--volt)] text-[var(--texto-invertido)] flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm text-[var(--texto-secundario)]">
            Intervalos VO₂ Max · 6 × 800 m. Datos sincronizados en RUNOVA.
          </p>
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)]">
            <Metric label="Distancia" value={distanceKm.toFixed(2)} unit="km" />
            <Metric label="Tiempo" value={formatTime(elapsedSec)} />
            <Metric label="Ritmo" value={`${pace}/km`} />
          </div>
        </div>
      </Modal>
    </div>
  );
};
