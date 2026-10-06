'use client';

import React, { useMemo, useState } from 'react';
import { Download, Printer, Share2, Check, FileSpreadsheet } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import { DataPagination } from '@/components/common/DataPagination';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Chip,
  Metric,
  DataTable,
} from '@/components/ui';

interface ReportsViewProps {
  onSelectView: (view: string) => void;
}

const TEMPLATES = [
  {
    id: 'athlete',
    title: 'Ficha atleta',
    desc: 'Biometría, zonas y últimas sesiones',
    tone: 'volt' as const,
  },
  {
    id: 'club',
    title: 'Resumen club',
    desc: 'KPIs agregados y cumplimiento',
    tone: 'cyan' as const,
  },
  {
    id: 'load',
    title: 'Carga & ACWR',
    desc: 'Tendencia de carga aguda/crónica',
    tone: 'coral' as const,
  },
];

export const ReportsView: React.FC<ReportsViewProps> = ({ onSelectView }) => {
  const { selectedAthlete, club, activities } = useRunova();
  const [template, setTemplate] = useState('athlete');
  const [actPage, setActPage] = useState(1);
  const [actPageSize, setActPageSize] = useState(5);

  const actItems = useMemo(() => {
    const start = (actPage - 1) * actPageSize;
    return activities.slice(start, start + actPageSize);
  }, [activities, actPage, actPageSize]);
  const [copied, setCopied] = useState(false);

  const handleExportCsv = () => {
    const rows = activities.map(
      (a) =>
        `${a.start_time},${a.title},${a.distance_km},${a.duration_sec},${a.avg_pace},${a.avg_heart_rate},${a.avg_cadence}`
    );
    const csv =
      'data:text/csv;charset=utf-8,' +
      'Fecha,Actividad,Distancia_KM,Duracion_s,Ritmo,FC,Cadencia\n' +
      rows.join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `RUNOVA_${template}_${selectedAthlete.full_name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  const handleShare = async () => {
    setCopied(true);
    try {
      await navigator.clipboard?.writeText(
        `RUNOVA report · ${template} · ${club.name}`
      );
    } catch {
      /* clipboard optional */
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Plantillas listas · exportar en 1 clic"
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<Printer size={16} />}
              onClick={() => window.print()}
            >
              PDF
            </Button>
            <Button leftIcon={<Download size={16} />} onClick={handleExportCsv}>
              CSV
            </Button>
            <Button
              variant="ghost"
              leftIcon={copied ? <Check size={16} /> : <Share2 size={16} />}
              onClick={handleShare}
            >
              {copied ? 'Copiado' : 'Compartir'}
            </Button>
          </>
        }
      />

      <Card hero padding="lg" className="border-[color-mix(in_srgb,var(--volt)_25%,transparent)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="volt">
              <FileSpreadsheet size={12} /> Export rápido
            </Badge>
            <h2 className="mt-2 text-2xl font-display font-extrabold text-[var(--texto-primario)]">
              {TEMPLATES.find((t) => t.id === template)?.title}
            </h2>
            <p className="text-sm text-[var(--texto-secundario)] mt-1">
              {selectedAthlete.full_name} · {club.name}
            </p>
          </div>
          <Button size="lg" leftIcon={<Download size={16} />} onClick={handleExportCsv}>
            Exportar 1 clic
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <Chip
            key={t.id}
            active={template === t.id}
            tone={t.tone}
            onClick={() => setTemplate(t.id)}
          >
            {t.title}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <Card
            key={t.id}
            className={
              template === t.id
                ? 'border-[color-mix(in_srgb,var(--volt)_35%,transparent)] cursor-pointer'
                : 'cursor-pointer'
            }
            onClick={() => setTemplate(t.id)}
          >
            <Badge tone={t.tone}>{t.title}</Badge>
            <p className="mt-3 text-sm text-[var(--texto-secundario)]">{t.desc}</p>
          </Card>
        ))}
      </div>

      <Card padding="none">
        <div className="p-5 border-b border-[var(--borde-cristal)] flex flex-wrap items-center justify-between gap-2">
          <p className="rv-caption uppercase tracking-wider">Vista previa · sesiones recientes</p>
          <Button variant="ghost" size="sm" onClick={() => onSelectView('inbox')}>
            Inbox
          </Button>
        </div>
        <div className="max-h-[min(50vh,420px)] overflow-y-auto overscroll-contain">
          <DataTable
            columns={[
              {
                key: 'title',
                header: 'Actividad',
                render: (r) => r.title,
              },
              {
                key: 'dist',
                header: 'Km',
                mono: true,
                align: 'right',
                render: (r) => r.distance_km,
              },
              {
                key: 'pace',
                header: 'Ritmo',
                mono: true,
                render: (r) => r.avg_pace,
              },
              {
                key: 'hr',
                header: 'FC',
                mono: true,
                align: 'right',
                render: (r) => r.avg_heart_rate,
              },
            ]}
            rows={actItems}
            rowKey={(r) => r.id}
          />
        </div>
        {activities.length > 0 && (
          <div className="p-4 border-t border-[var(--borde-cristal)]">
            <DataPagination
              currentPage={actPage}
              totalItems={activities.length}
              pageSize={actPageSize}
              onPageChange={setActPage}
              onPageSizeChange={(size) => {
                setActPageSize(size);
                setActPage(1);
              }}
              pageSizeOptions={[5, 8, 12]}
            />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Atleta" value={selectedAthlete.full_name.split(' ')[0]} />
        <Metric label="VO₂" value={selectedAthlete.vo2_max} />
        <Metric label="ACWR" value={selectedAthlete.acwr} />
        <Metric label="Cumplimiento" value={selectedAthlete.compliance_rate} unit="%" />
      </div>
    </div>
  );
};
