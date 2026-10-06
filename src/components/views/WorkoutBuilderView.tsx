'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Send,
  Play,
  Layers,
  Save,
  RotateCcw,
} from 'lucide-react';
import { Workout, WorkoutBlock } from '@/types/database';
import { useRunova } from '@/context/RunovaContext';
import { zenithToast } from '@/components/common/ZenithToaster';
import { DataPagination } from '@/components/common/DataPagination';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Chip,
  Metric,
  Tabs,
  ProgressBar,
  FilterBar,
  SearchInput,
  SelectFilter,
} from '@/components/ui';

interface WorkoutBuilderProps {
  onSelectView: (view: string) => void;
  onOpenLive: () => void;
}

const BLOCK_INTENSITY: Record<WorkoutBlock['type'], number> = {
  warmup: 35,
  recovery: 25,
  steady: 55,
  interval: 90,
  cooldown: 30,
};

const BLOCK_LABEL: Record<WorkoutBlock['type'], string> = {
  warmup: 'Calentamiento',
  interval: 'Intervalo',
  recovery: 'Recuperación',
  steady: 'Continuo',
  cooldown: 'Enfriamiento',
};

function estimateBlockMinutes(b: WorkoutBlock): number {
  if (b.duration_seconds) return (b.duration_seconds * (b.repetitions || 1)) / 60;
  if (b.distance_meters && b.target_pace_min) {
    const [mm, ss] = b.target_pace_min.split(':').map(Number);
    const paceMinPerKm = mm + (ss || 0) / 60;
    const km = (b.distance_meters * (b.repetitions || 1)) / 1000;
    return km * paceMinPerKm;
  }
  if (b.distance_meters) return ((b.distance_meters * (b.repetitions || 1)) / 1000) * 5;
  return 5;
}

export const WorkoutBuilderView: React.FC<WorkoutBuilderProps> = ({
  onSelectView,
  onOpenLive,
}) => {
  const { workouts, athletes, addWorkout, updateWorkout, assignWorkout } = useRunova();
  const [tab, setTab] = useState('builder');
  const [libPage, setLibPage] = useState(1);
  const [libPageSize, setLibPageSize] = useState(6);
  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState('all');
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<
    'Intervalos' | 'Rodaje' | 'Fondo' | 'Recuperación' | 'Cuestas' | 'Test'
  >('Rodaje');
  const [targetPace, setTargetPace] = useState('');
  const [targetHrZone, setTargetHrZone] = useState('');
  const [objective, setObjective] = useState('');
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
  const [assignedAthletes, setAssignedAthletes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const summary = useMemo(() => {
    const distanceKm =
      blocks.reduce((acc, b) => {
        if (!b.distance_meters) return acc;
        return acc + (b.distance_meters * (b.repetitions || 1)) / 1000;
      }, 0);
    const minutes = blocks.reduce((acc, b) => acc + estimateBlockMinutes(b), 0);
    const avgIf =
      blocks.length === 0
        ? 0
        : blocks.reduce((acc, b) => acc + BLOCK_INTENSITY[b.type] / 100, 0) / blocks.length;
    const tss = Math.round((minutes / 60) * avgIf * avgIf * 100);
    return {
      distanceKm: Number(distanceKm.toFixed(1)),
      minutes: Math.round(minutes),
      tss,
    };
  }, [blocks]);

  const libFiltered = useMemo(() => {
    return workouts.filter((w) => {
      const q = libSearch.trim().toLowerCase();
      const matchQ = !q || w.title.toLowerCase().includes(q) || w.objective?.toLowerCase().includes(q);
      const matchCat = libCategory === 'all' || w.category === libCategory;
      return matchQ && matchCat;
    });
  }, [workouts, libSearch, libCategory]);

  const libItems = useMemo(() => {
    const start = (libPage - 1) * libPageSize;
    return libFiltered.slice(start, start + libPageSize);
  }, [libFiltered, libPage, libPageSize]);

  const handleAddBlock = (type: WorkoutBlock['type']) => {
    setBlocks((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        order: prev.length + 1,
        type,
        repetitions: type === 'interval' ? 4 : 1,
        distance_meters: type === 'recovery' ? undefined : type === 'interval' ? 1000 : 2000,
        duration_seconds: type === 'recovery' ? 90 : undefined,
        target_pace_min: type === 'interval' ? '4:10' : '5:15',
        description: BLOCK_LABEL[type],
      },
    ]);
  };

  const handleSave = async (): Promise<string | null> => {
    const title = workoutTitle.trim() || `Sesión ${category}`;
    setIsSaving(true);
    try {
      if (editingWorkoutId) {
        await updateWorkout(editingWorkoutId, {
          title,
          category,
          target_date: targetDate,
          target_pace: targetPace || '—',
          target_hr_zone: targetHrZone || '—',
          total_distance_km: summary.distanceKm,
          objective,
          blocks,
        });
        zenithToast.success(`Sesión "${title}" actualizada.`);
        return editingWorkoutId;
      } else {
        const created = await addWorkout({
          title,
          category,
          target_date: targetDate,
          target_pace: targetPace || '—',
          target_hr_zone: targetHrZone || '—',
          total_distance_km: summary.distanceKm,
          objective,
          blocks,
        });
        if (created?.id) {
          setEditingWorkoutId(created.id);
          return created.id;
        }
      }
      return null;
    } catch (err: any) {
      console.error('Error al guardar sesión:', err);
      zenithToast.error(`No se pudo guardar la sesión: ${err?.message || 'Error'}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssign = async () => {
    if (assignedAthletes.length === 0) {
      zenithToast.warning('Selecciona al menos un atleta de la lista lateral para asignar.');
      return;
    }

    setIsAssigning(true);
    try {
      let workoutIdToAssign = editingWorkoutId;
      if (!workoutIdToAssign) {
        workoutIdToAssign = await handleSave();
      }
      if (workoutIdToAssign) {
        await assignWorkout(workoutIdToAssign, assignedAthletes);
      }
    } catch (err: any) {
      console.error('Error al asignar workout:', err);
      zenithToast.error(`Error al asignar: ${err?.message || 'Error'}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleNewSession = () => {
    setEditingWorkoutId(null);
    setWorkoutTitle('');
    setCategory('Rodaje');
    setTargetDate(new Date().toISOString().split('T')[0]);
    setTargetPace('');
    setTargetHrZone('');
    setObjective('');
    setBlocks([]);
    setAssignedAthletes([]);
    zenithToast.info('Lienzo listo para una nueva sesión.');
  };

  const loadWorkoutIntoBuilder = (wkt: Workout) => {
    setEditingWorkoutId(wkt.id);
    setWorkoutTitle(wkt.title);
    setCategory((wkt.category as any) || 'Rodaje');
    setTargetDate(wkt.target_date || new Date().toISOString().split('T')[0]);
    setTargetPace(wkt.target_pace || '');
    setTargetHrZone(wkt.target_hr_zone || '');
    setObjective(wkt.objective || '');
    setBlocks(wkt.blocks || []);
    setTab('builder');
    zenithToast.info(`Sesión "${wkt.title}" cargada en el lienzo.`);
  };

  const inputClass = 'input-zenith w-full';

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title="Constructor de sesiones"
        subtitle="Lienzo modular de bloques con resumen de carga en vivo"
        actions={
          <>
            <Button variant="secondary" onClick={() => onSelectView('inbox')}>
              Inbox
            </Button>
            <Button variant="primary" leftIcon={<Play size={16} />} onClick={onOpenLive}>
              Abrir Live
            </Button>
          </>
        }
      />

      <Tabs
        tabs={[
          { id: 'builder', label: 'Lienzo' },
          { id: 'library', label: `Biblioteca (${workouts.length})` },
        ]}
        activeId={tab}
        onChange={(id) => {
          setTab(id);
          if (id === 'library') setLibPage(1);
        }}
      />

      {tab === 'builder' && (
        <>
          <Card hero padding="lg" className="border-[color-mix(in_srgb,var(--volt)_28%,transparent)]">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge tone={editingWorkoutId ? 'cyan' : 'volt'}>
                    {editingWorkoutId ? 'Editando guardada' : 'Sesión activa'}
                  </Badge>
                  {editingWorkoutId && (
                    <Button size="sm" variant="ghost" onClick={handleNewSession} leftIcon={<RotateCcw size={12} />}>
                      Nueva en blanco
                    </Button>
                  )}
                </div>
                <input
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  placeholder="Título de la sesión (ej: Series 6x1000m R1')"
                  className="w-full bg-transparent text-2xl sm:text-3xl font-display font-extrabold text-[var(--texto-primario)] tracking-tight border-b border-[var(--borde-default)] focus:border-[var(--volt)] focus:outline-none pb-2"
                  aria-label="Título de la sesión"
                />
                <p className="text-sm text-[var(--texto-secundario)] leading-relaxed max-w-2xl">
                  {objective || 'Describe el objetivo táctico o fisiológico en el panel inferior'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={inputClass + ' w-auto text-sm'}
                  aria-label="Fecha programada"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className={inputClass + ' w-auto min-w-[140px]'}
                >
                  <option value="Intervalos">Intervalos</option>
                  <option value="Rodaje">Rodaje</option>
                  <option value="Fondo">Fondo</option>
                  <option value="Recuperación">Recuperación</option>
                  <option value="Cuestas">Cuestas</option>
                  <option value="Test">Test</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[var(--borde-default)]">
              <Metric label="Distancia" value={summary.distanceKm} unit="km" size="md" />
              <Metric label="Tiempo est." value={summary.minutes} unit="min" size="md" />
              <Metric label="TSS est." value={summary.tss} size="md" meaning="Carga estimada" />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Card className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-[var(--cyan)]" />
                  <span className="rv-caption uppercase tracking-wider">
                    Bloques ({blocks.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['warmup', 'Calentamiento'],
                      ['interval', 'Intervalo'],
                      ['recovery', 'Recuperación'],
                      ['cooldown', 'Enfriamiento'],
                    ] as const
                  ).map(([type, label]) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={type === 'interval' ? 'primary' : 'secondary'}
                      leftIcon={<Plus size={14} />}
                      onClick={() => handleAddBlock(type)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {blocks.map((block, idx) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)]"
                  >
                    <span className="rv-data text-xs text-[var(--texto-terciario)] w-6 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge
                          tone={
                            block.type === 'interval'
                              ? 'volt'
                              : block.type === 'recovery'
                                ? 'cyan'
                                : 'neutral'
                          }
                        >
                          {block.repetitions > 1 ? `${block.repetitions} × ` : ''}
                          {BLOCK_LABEL[block.type]}
                        </Badge>
                        {block.distance_meters && (
                          <span className="rv-data text-sm text-[var(--texto-primario)]">
                            {block.distance_meters} m
                          </span>
                        )}
                        {block.duration_seconds && (
                          <span className="rv-data text-sm text-[var(--texto-secundario)]">
                            {block.duration_seconds} s
                          </span>
                        )}
                        {block.target_pace_min && (
                          <span className="rv-data text-sm text-[var(--volt)]">
                            @{block.target_pace_min}/km
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--texto-secundario)] truncate">
                        {block.description}
                      </p>
                      <ProgressBar
                        className="mt-2"
                        value={BLOCK_INTENSITY[block.type]}
                        label="Intensidad"
                        valueLabel={`${BLOCK_INTENSITY[block.type]}%`}
                        color={
                          block.type === 'interval'
                            ? 'var(--volt)'
                            : block.type === 'recovery'
                              ? 'var(--cyan)'
                              : 'var(--texto-terciario)'
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Eliminar bloque"
                      onClick={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                    >
                      <Trash2 size={16} className="text-[var(--coral)]" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="rv-caption uppercase tracking-wider block mb-1.5">
                    Ritmo objetivo
                  </label>
                  <input
                    value={targetPace}
                    onChange={(e) => setTargetPace(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="rv-caption uppercase tracking-wider block mb-1.5">
                    Zona FC
                  </label>
                  <input
                    value={targetHrZone}
                    onChange={(e) => setTargetHrZone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="rv-caption uppercase tracking-wider block mb-1.5">
                  Objetivo
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  rows={2}
                  className={inputClass + ' py-3 min-h-[88px]'}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={handleSave}
                  disabled={isSaving || isAssigning}
                  leftIcon={<Save size={16} />}
                >
                  {isSaving
                    ? 'Guardando…'
                    : editingWorkoutId
                      ? 'Actualizar sesión'
                      : 'Guardar en biblioteca'}
                </Button>
                <Button
                  leftIcon={<Send size={16} />}
                  onClick={handleAssign}
                  disabled={isSaving || isAssigning || assignedAthletes.length === 0}
                >
                  {isAssigning ? 'Asignando…' : `Asignar (${assignedAthletes.length})`}
                </Button>
              </div>
            </Card>

            <Card className="lg:col-span-4 space-y-3">
              <p className="rv-caption uppercase tracking-wider">Atletas asignados</p>
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {athletes.map((ath) => {
                  const active = assignedAthletes.includes(ath.id);
                  return (
                    <Chip
                      key={ath.id}
                      active={active}
                      tone="volt"
                      className="w-full justify-between"
                      onClick={() =>
                        setAssignedAthletes((prev) =>
                          active ? prev.filter((id) => id !== ath.id) : [...prev, ath.id]
                        )
                      }
                    >
                      <span className="truncate">{ath.full_name}</span>
                      <span className="rv-data text-[10px] opacity-70">{ath.threshold_pace}</span>
                    </Chip>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === 'library' && (
        <>
          <FilterBar
            searchSlot={
              <SearchInput
                value={libSearch}
                onChange={(v) => { setLibSearch(v); setLibPage(1); }}
                placeholder="Buscar sesión…"
                className="flex-1"
              />
            }
            rightSlot={
              <SelectFilter
                value={libCategory}
                onChange={(v) => { setLibCategory(v); setLibPage(1); }}
                className="w-44"
                aria-label="Filtrar por categoría"
                options={[
                  { value: 'all', label: 'Todas' },
                  { value: 'Intervalos', label: 'Intervalos' },
                  { value: 'Rodaje', label: 'Rodaje' },
                  { value: 'Fondo', label: 'Fondo' },
                  { value: 'Recuperación', label: 'Recuperación' },
                  { value: 'Cuestas', label: 'Cuestas' },
                  { value: 'Test', label: 'Test' },
                ]}
              />
            }
            resultCount={libFiltered.length}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {libItems.map((wkt) => (
              <Card key={wkt.id} className="space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="volt">{wkt.category}</Badge>
                    <span className="rv-caption">{wkt.target_date}</span>
                  </div>
                  <h3 className="font-display font-bold text-[var(--texto-primario)]">{wkt.title}</h3>
                  <p className="text-sm text-[var(--texto-secundario)] line-clamp-2">{wkt.objective}</p>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--borde-default)]">
                    <Metric label="Dist." value={wkt.total_distance_km} unit="km" />
                    <Metric label="Ritmo" value={wkt.target_pace} />
                    <Metric label="Zona" value={wkt.target_hr_zone} />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => loadWorkoutIntoBuilder(wkt)}
                  >
                    Cargar en lienzo
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          {libFiltered.length === 0 && (
            <p className="text-sm text-[var(--texto-terciario)] text-center py-8">
              No hay sesiones en la biblioteca.
            </p>
          )}
          {libFiltered.length > 0 && (
            <DataPagination
              currentPage={libPage}
              totalItems={libFiltered.length}
              pageSize={libPageSize}
              onPageChange={setLibPage}
              onPageSizeChange={(size) => {
                setLibPageSize(size);
                setLibPage(1);
              }}
              pageSizeOptions={[6, 10, 16]}
            />
          )}
        </>
      )}
    </div>
  );
};
