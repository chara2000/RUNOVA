'use client';

import React, { useMemo, useState } from 'react';
import { Users, Calendar, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import { DataPagination } from '@/components/common/DataPagination';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatCard,
  EmptyState,
} from '@/components/ui';

interface ClubDashboardProps {
  onSelectView: (view: string) => void;
}

export const ClubDashboardView: React.FC<ClubDashboardProps> = ({ onSelectView }) => {
  const { club, groups, coach, athletes, races } = useRunova();

  const coaches = useMemo(() => {
    if (!coach.id) return [];
    return [
      {
        name: coach.specialty ? `Coach · ${coach.specialty}` : 'Head Coach',
        role: coach.specialty || 'General',
        athletes: coach.athletes_count || athletes.length,
      },
    ];
  }, [coach, athletes.length]);

  const upcomingEvents = useMemo(() => {
    return races
      .filter((r) => r.status === 'upcoming')
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 6)
      .map((r) => ({
        title: r.name,
        date: r.event_date.slice(0, 10),
        enrolled: r.training_weeks_left,
        id: r.id,
      }));
  }, [races]);

  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(6);

  const groupItems = useMemo(() => {
    const start = (groupPage - 1) * groupPageSize;
    return groups.slice(start, start + groupPageSize);
  }, [groups, groupPage, groupPageSize]);

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title={club.name}
        subtitle={`${club.location} · ${club.members_count} socios`}
        actions={
          <Button
            variant="secondary"
            leftIcon={<FileSpreadsheet size={16} />}
            onClick={() => onSelectView('reports')}
          >
            Informes
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Socios activos"
          value={club.members_count}
          meaning="Base oficial"
          accent="volt"
          icon={Users}
        />
        <StatCard label="Grupos" value={groups.length} meaning="Estructura" accent="cyan" />
        <StatCard
          label="Coaches"
          value={coaches.length}
          meaning="Staff técnico"
          accent="neutral"
        />
        <StatCard
          label="Próximos eventos"
          value={upcomingEvents.length}
          meaning="Calendario"
          accent="volt"
          icon={Calendar}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)]">
              Staff técnico
            </h2>
            <Badge tone="neutral">{coaches.length}</Badge>
          </div>
          {coaches.length === 0 ? (
            <EmptyState
              title="Sin coaches"
              description="El staff aparecerá cuando haya un perfil coach vinculado al club."
            />
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto overscroll-contain pr-1">
              {coaches.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between gap-3 min-h-14 px-3 rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--texto-primario)] truncate">
                      {c.name}
                    </p>
                    <p className="rv-caption">{c.role}</p>
                  </div>
                  <span className="rv-data text-sm text-[var(--texto-secundario)] shrink-0">
                    {c.athletes} atletas
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)]">
              Próximos eventos
            </h2>
            <Button variant="ghost" size="sm" onClick={() => onSelectView('races')}>
              Ver todos <ArrowRight size={14} />
            </Button>
          </div>
          {upcomingEvents.length === 0 ? (
            <EmptyState
              title="Sin eventos"
              description="Aún no hay competiciones en el calendario del club."
              actionLabel="Ir a Race Center"
              onAction={() => onSelectView('races')}
            />
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto overscroll-contain pr-1">
              {upcomingEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 min-h-14 px-3 rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--texto-primario)] truncate">
                      {e.title}
                    </p>
                    <p className="rv-caption">{e.date}</p>
                  </div>
                  <Badge tone="cyan">{e.enrolled}sem</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-black italic uppercase tracking-tighter text-[var(--texto-primario)]">
            Grupos del club
          </h2>
          <Button variant="secondary" onClick={() => onSelectView('athletes')}>
            Ver padrón
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupItems.map((g) => (
            <div
              key={g.id}
              className="p-4 rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)]"
            >
              <p className="text-sm font-display font-bold text-[var(--texto-primario)]">
                {g.name}
              </p>
              <p className="rv-caption mt-1">{g.member_count} miembros</p>
            </div>
          ))}
        </div>
        {groups.length > 0 && (
          <div className="mt-4">
            <DataPagination
              currentPage={groupPage}
              totalItems={groups.length}
              pageSize={groupPageSize}
              onPageChange={setGroupPage}
              onPageSizeChange={(size) => {
                setGroupPageSize(size);
                setGroupPage(1);
              }}
              pageSizeOptions={[6, 9, 12]}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
