'use client';

import React, { useMemo, useState } from 'react';
import {
  Inbox,
  CheckCircle2,
  Trash2,
  BarChart3,
  UploadCloud,
  Watch,
} from 'lucide-react';
import { ActivityInboxItem } from '@/types/database';
import { useRunova } from '@/context/RunovaContext';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataPagination } from '@/components/common/DataPagination';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Metric,
  FilterBar,
  SearchInput,
  SelectFilter,
} from '@/components/ui';

interface ActivityInboxProps {
  onSelectView: (view: string) => void;
}

export const ActivityInboxView: React.FC<ActivityInboxProps> = ({ onSelectView }) => {
  const { inboxActivities, saveInboxActivity, discardInboxActivity } = useRunova();
  const [selected, setSelected] = useState<ActivityInboxItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return inboxActivities.filter((act) => {
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        act.title.toLowerCase().includes(q) ||
        act.athlete_name.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || act.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [inboxActivities, search, statusFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title="Activity Inbox"
        subtitle={`${inboxActivities.length} pendiente${inboxActivities.length === 1 ? '' : 's'} de validar`}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<UploadCloud size={16} />}
              onClick={() => onSelectView('import')}
            >
              Importar
            </Button>
            <Button
              variant="ghost"
              leftIcon={<Watch size={16} />}
              onClick={() => onSelectView('devices')}
            >
              Dispositivos
            </Button>
          </>
        }
      />

      {inboxActivities.length === 0 ? (
        <EmptyState
          title="Bandeja al día"
          description="No hay actividades pendientes. Todas las sesiones están validadas o descartadas."
          icon={CheckCircle2}
          actionText="Importar actividad"
          onAction={() => onSelectView('import')}
          accentColor="var(--volt)"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-3 max-h-[min(70vh,720px)] overflow-y-auto overscroll-contain pr-1">
            <FilterBar
              searchSlot={
                <SearchInput
                  value={search}
                  onChange={(v) => { setSearch(v); setPage(1); }}
                  placeholder="Buscar actividad o atleta…"
                  className="flex-1"
                />
              }
              rightSlot={
                <SelectFilter
                  value={statusFilter}
                  onChange={(v) => { setStatusFilter(v); setPage(1); }}
                  className="w-36"
                  aria-label="Filtrar por estado"
                  options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'pending', label: 'Pendientes' },
                    { value: 'analyzed', label: 'Analizados' },
                  ]}
                />
              }
              resultCount={filtered.length}
            />
            {pageItems.map((act) => {
              const isSelected = selected?.id === act.id;
              return (
                <Card
                  key={act.id}
                  className={
                    isSelected
                      ? 'border-[color-mix(in_srgb,var(--cyan)_40%,transparent)]'
                      : undefined
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="cyan">{act.raw_source}</Badge>
                      <StatusBadge status={act.status || 'pending'} />
                    </div>
                    <span className="rv-caption">{act.synced_at}</span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[var(--texto-primario)] mb-1">
                    {act.title}
                  </h3>
                  <p className="text-xs text-[var(--texto-secundario)] mb-4">
                    {act.athlete_name} · {act.activity_date} · {act.device_model}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <Metric label="Distancia" value={act.distance_km} unit="km" />
                    <Metric label="Tiempo" value={act.duration_formatted} />
                    <Metric label="Ritmo" value={act.avg_pace} />
                    <Metric label="FC media" value={act.avg_heart_rate} unit="bpm" />
                  </div>

                  {act.suggested_workout_title && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] px-3 py-2">
                      <span className="text-xs text-[var(--texto-secundario)]">
                        Match: <strong className="text-[var(--texto-primario)]">{act.suggested_workout_title}</strong>
                      </span>
                      <Badge tone="cyan">{act.match_confidence_pct}% </Badge>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--borde-default)]">
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<BarChart3 size={14} />}
                      onClick={() => setSelected(act)}
                    >
                      Analizar
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<CheckCircle2 size={14} />}
                      onClick={() => saveInboxActivity(act)}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      aria-label="Descartar"
                      onClick={() => discardInboxActivity(act.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
            {filtered.length > 0 && (
              <DataPagination
                currentPage={page}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[6, 10, 16]}
              />
            )}
          </div>

          <div className="lg:col-span-5">
            {selected ? (
              <Card className="sticky top-24 max-h-[min(70vh,720px)] overflow-y-auto space-y-4 border-[color-mix(in_srgb,var(--cyan)_30%,transparent)]">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="cyan">Telemetría</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    Cerrar
                  </Button>
                </div>
                <h3 className="font-display font-bold text-[var(--texto-primario)]">
                  {selected.title}
                </h3>
                <p className="text-sm text-[var(--texto-secundario)] leading-relaxed">
                  {selected.notes}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm py-2 border-b border-[var(--borde-default)]">
                    <span className="text-[var(--texto-secundario)]">Cadencia</span>
                    <span className="rv-data text-[var(--volt)]">{selected.avg_cadence} spm</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[var(--borde-default)]">
                    <span className="text-[var(--texto-secundario)]">FC máx</span>
                    <span className="rv-data text-[var(--coral)]">{selected.max_heart_rate} bpm</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-[var(--borde-default)]">
                    <span className="text-[var(--texto-secundario)]">Elevación</span>
                    <span className="rv-data">+{selected.elevation_gain_m} m</span>
                  </div>
                  <div className="flex justify-between text-sm py-2">
                    <span className="text-[var(--texto-secundario)]">Calorías</span>
                    <span className="rv-data">{selected.calories} kcal</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => onSelectView('plan-vs-real')}
                  >
                    vs Plan
                  </Button>
                  <Button className="flex-1" onClick={() => saveInboxActivity(selected)}>
                    Guardar
                  </Button>
                </div>
              </Card>
            ) : (
              <EmptyState
                title="Sin selección"
                description="Pulsa Analizar en una fila para inspeccionar cadencia, FC y elevación."
                icon={Inbox}
                accentColor="var(--cyan)"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
