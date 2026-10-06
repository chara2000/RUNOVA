'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Users, Dumbbell, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import { AthleteMemberCard } from '@/components/shared/AthleteMemberCard';
import { DataPagination } from '@/components/common/DataPagination';
import {
  Card,
  Button,
  Badge,
  Metric,
  Chip,
  Skeleton,
  StatCard,
} from '@/components/ui';

interface CoachDashboardProps {
  onSelectView: (view: string) => void;
  onSelectAthlete?: (athleteId: string) => void;
}

export const CoachDashboardView: React.FC<CoachDashboardProps> = ({
  onSelectView,
  onSelectAthlete,
}) => {
  const { athletes, devices, selectAthlete, club, coach } = useRunova();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const attention = athletes.filter((a) => a.status === 'attention' || a.status === 'review');
  const filtered =
    filter === 'all' ? athletes : athletes.filter((a) => a.status === filter);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const openAthlete = (id: string) => {
    selectAthlete(id);
    onSelectAthlete?.(id);
    onSelectView('profile');
  };

  return (
    <div className="rv-page space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primario)]/10 flex items-center justify-center border border-[color-mix(in_srgb,var(--brand-primario)_25%,transparent)] shadow-[0_0_20px_rgba(193,244,41,0.12)]">
              <Users size={22} className="text-[var(--brand-primario)]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand-primario)] font-display">
              Equipo en seguimiento
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-black italic uppercase tracking-tighter leading-[0.85] text-[var(--texto-primario)]">
            Athlete <span className="text-[var(--brand-primario)]">base</span>
          </h1>
          <p className="text-sm text-[var(--texto-secundario)] mt-3">
            {club.name}
            {coach.specialty ? ` · ${coach.specialty}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="secondary"
            leftIcon={<Users size={16} />}
            onClick={() => onSelectView('athletes')}
          >
            Atletas
          </Button>
          <Button leftIcon={<Dumbbell size={16} />} onClick={() => onSelectView('workouts')}>
            Planificar
          </Button>
          <Button
            variant="ghost"
            leftIcon={<FileSpreadsheet size={16} />}
            onClick={() => onSelectView('reports')}
          >
            Reportes
          </Button>
        </div>
      </div>

      <Card hero padding="lg" className="border-[color-mix(in_srgb,var(--brand-terciario)_28%,transparent)] overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[var(--brand-terciario)]/15 blur-[80px] pointer-events-none" />
        <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-[var(--brand-primario)]/10 blur-[60px] pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="cyan" pulse>
              Equipo hoy
            </Badge>
            <h2 className="mt-3 text-3xl sm:text-4xl font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)]">
              {athletes.length}{' '}
              <span className="text-[var(--brand-primario)]">atletas</span>
            </h2>
            <p className="text-sm text-[var(--texto-secundario)] mt-2 max-w-md">
              {attention.length > 0
                ? `${attention.length} requieren atención de carga o FC`
                : 'Sin alertas críticas de carga'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <Metric label="Roster" value={athletes.length} />
            <Metric label="Alertas" value={attention.length} />
            <Metric
              label="Pool HW"
              value={devices.filter((d) => d.is_coach_owned).length}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Óptimos"
          value={athletes.filter((a) => a.status === 'optimal').length}
          accent="volt"
          icon={Users}
        />
        <StatCard
          label="Carga alta"
          value={athletes.filter((a) => a.status === 'attention').length}
          accent="coral"
          icon={AlertTriangle}
        />
        <StatCard
          label="Cumplimiento medio"
          value={
            athletes.length
              ? Math.round(
                  athletes.reduce((s, a) => s + a.compliance_rate, 0) / athletes.length
                )
              : 0
          }
          unit="%"
          accent="cyan"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'optimal', label: 'Óptimo' },
          { id: 'attention', label: 'Atención' },
          { id: 'review', label: 'Revisar' },
        ].map((f) => (
          <Chip
            key={f.id}
            active={filter === f.id}
            tone="cyan"
            onClick={() => {
              setFilter(f.id);
              setPage(1);
            }}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-busy>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] rounded-[var(--radio-lg)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {pageItems.map((ath, i) => (
              <AthleteMemberCard
                key={ath.id}
                athlete={ath}
                index={i}
                onOpen={() => openAthlete(ath.id)}
              />
            ))}
          </div>
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
              pageSizeOptions={[8, 12, 16]}
            />
          )}
        </>
      )}
    </div>
  );
};
