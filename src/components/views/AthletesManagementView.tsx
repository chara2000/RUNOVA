'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Dumbbell, User } from 'lucide-react';
import { Athlete } from '@/types/database';
import { useRunova } from '@/context/RunovaContext';
import { AthleteMemberCard } from '@/components/shared/AthleteMemberCard';
import { PremiumModal } from '@/components/shared/PremiumModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataPagination } from '@/components/common/DataPagination';
import { Card, Button, EmptyState, FilterBar, SearchInput, FilterChips } from '@/components/ui';

interface AthletesManagementProps {
  onSelectView: (view: string) => void;
  onSelectAthlete?: (athleteId: string) => void;
}

type FormState = {
  full_name: string;
  level: Athlete['level'];
  preferred_distance: Athlete['preferred_distance'];
  gender: Athlete['gender'];
  date_of_birth: string;
  weight_kg: string;
  height_cm: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  full_name: '',
  level: 'Intermedio',
  preferred_distance: '10K',
  gender: 'M',
  date_of_birth: '',
  weight_kg: '',
  height_cm: '',
  email: '',
  phone: '',
  notes: '',
});

export const AthletesManagementView: React.FC<AthletesManagementProps> = ({
  onSelectView,
  onSelectAthlete,
}) => {
  const { athletes, addAthlete, updateAthlete, deleteAthlete, selectAthlete } = useRunova();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const filtered = useMemo(() => {
    return athletes.filter((ath) => {
      const matchesSearch = ath.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ath.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [athletes, searchTerm, statusFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFormError(null);
  };

  const openAdd = () => {
    setForm(emptyForm());
    setEditing(null);
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEdit = (ath: Athlete) => {
    setEditing(ath);
    setForm({
      full_name: ath.full_name,
      level: ath.level,
      preferred_distance: ath.preferred_distance,
      gender: ath.gender || 'M',
      date_of_birth: ath.date_of_birth || '',
      weight_kg: ath.weight_kg != null ? String(ath.weight_kg) : '',
      height_cm: ath.height_cm != null ? String(ath.height_cm) : '',
      email: '',
      phone: '',
      notes: '',
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  const handleSave = () => {
    if (!form.full_name.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    if (!form.preferred_distance) {
      setFormError('Selecciona la distancia preferida.');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFormError('Correo electrónico no válido.');
      return;
    }

    const payload: Partial<Athlete> = {
      full_name: form.full_name.trim(),
      level: form.level,
      preferred_distance: form.preferred_distance,
      gender: form.gender,
    };
    if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;
    if (form.weight_kg) payload.weight_kg = Number(form.weight_kg);
    if (form.height_cm) payload.height_cm = Number(form.height_cm);

    if (editing) {
      updateAthlete(editing.id, payload);
    } else {
      addAthlete({
        ...payload,
        status: 'optimal',
      } as Partial<Athlete>);
    }
    setIsAddOpen(false);
    setEditing(null);
  };

  const handleOpenAthlete = (ath: Athlete) => {
    selectAthlete(ath.id);
    onSelectAthlete?.(ath.id);
    onSelectView('profile');
  };

  return (
    <div className="rv-page space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-[var(--radio-md)] bg-[var(--brand-primario)]/10 flex items-center justify-center border border-[color-mix(in_srgb,var(--brand-primario)_25%,transparent)]">
              <User size={20} className="text-[var(--brand-primario)]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--brand-primario)] font-display">
              Base de atletas
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-black italic uppercase tracking-tighter leading-[0.9] text-[var(--texto-primario)]">
            Member <span className="text-[var(--brand-primario)]">roster</span>
          </h1>
          <p className="text-sm text-[var(--texto-secundario)] mt-2">
            {athletes.length} corredores · carga, cumplimiento y riesgo operativo
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button leftIcon={<Plus size={16} />} onClick={openAdd}>
            Nuevo atleta
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Dumbbell size={16} />}
            onClick={() => onSelectView('workouts')}
          >
            Sesiones
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <FilterBar
        searchSlot={
          <SearchInput
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setPage(1); }}
            placeholder="Buscar por nombre…"
            className="flex-1"
          />
        }
        chipsSlot={
          <FilterChips
            value={statusFilter}
            onChange={(id) => { setStatusFilter(id); setPage(1); }}
            options={[
              { id: 'all', label: 'Todos', count: athletes.length },
              { id: 'optimal', label: 'Óptimo', count: athletes.filter(a => a.status === 'optimal').length },
              { id: 'attention', label: 'Atención', count: athletes.filter(a => a.status === 'attention').length },
              { id: 'review', label: 'Revisar', count: athletes.filter(a => a.status === 'review').length },
              { id: 'no_data', label: 'Sin datos', count: athletes.filter(a => a.status === 'no_data').length },
            ]}
          />
        }
        resultCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title="Sin atletas"
          description="No hay corredores con estos filtros. Ajusta la búsqueda o crea uno nuevo."
          actionLabel="Nuevo atleta"
          onAction={openAdd}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {pageItems.map((ath, i) => (
              <AthleteMemberCard
                key={ath.id}
                athlete={ath}
                index={i}
                onOpen={() => handleOpenAthlete(ath)}
                onEdit={() => openEdit(ath)}
                onDelete={() => setDeletingId(ath.id)}
              />
            ))}
          </div>
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
        </>
      )}

      <PremiumModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Editar atleta' : 'Nuevo atleta'}
        subtitle="Completa la ficha técnica mínima"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {formError && (
            <div className="rounded-[var(--radio-md)] border border-[color-mix(in_srgb,var(--peligro)_30%,transparent)] bg-[color-mix(in_srgb,var(--peligro)_8%,transparent)] px-3 py-2.5 text-sm text-[var(--peligro)]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="rv-caption mb-1.5 block">Nombre completo *</span>
              <input
                className="input-zenith"
                value={form.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
                placeholder="Ej. Juan David Riascos"
                required
              />
            </label>

            <label className="block">
              <span className="rv-caption mb-1.5 block">Correo</span>
              <input
                type="email"
                className="input-zenith"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="atleta@club.com"
              />
            </label>

            <label className="block">
              <span className="rv-caption mb-1.5 block">Teléfono</span>
              <input
                className="input-zenith"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="+57 300 000 0000"
              />
            </label>

            <label className="block">
              <span className="rv-caption mb-1.5 block">Nivel *</span>
              <select
                className="input-zenith"
                value={form.level}
                onChange={(e) => setField('level', e.target.value as Athlete['level'])}
              >
                {(['Principiante', 'Intermedio', 'Avanzado', 'Elite'] as const).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="rv-caption mb-1.5 block">Distancia preferida *</span>
              <select
                className="input-zenith"
                value={form.preferred_distance}
                onChange={(e) =>
                  setField('preferred_distance', e.target.value as Athlete['preferred_distance'])
                }
              >
                {(['5K', '10K', '21K', '42K', 'Trail', 'Ultra'] as const).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="rv-caption mb-1.5 block">Sexo</span>
              <select
                className="input-zenith"
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value as Athlete['gender'])}
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTHER">Otro</option>
              </select>
            </label>

            <label className="block">
              <span className="rv-caption mb-1.5 block">Fecha de nacimiento</span>
              <input
                type="date"
                className="input-zenith"
                value={form.date_of_birth}
                onChange={(e) => setField('date_of_birth', e.target.value)}
              />
            </label>

            <label className="block">
              <span className="rv-caption mb-1.5 block">Peso (kg)</span>
              <input
                type="number"
                min={30}
                max={200}
                step={0.1}
                className="input-zenith"
                value={form.weight_kg}
                onChange={(e) => setField('weight_kg', e.target.value)}
                placeholder="68.5"
              />
            </label>

            <label className="block">
              <span className="rv-caption mb-1.5 block">Estatura (cm)</span>
              <input
                type="number"
                min={120}
                max={230}
                className="input-zenith"
                value={form.height_cm}
                onChange={(e) => setField('height_cm', e.target.value)}
                placeholder="175"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="rv-caption mb-1.5 block">Notas del coach</span>
              <textarea
                className="input-zenith min-h-[88px] resize-y"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Lesiones, objetivos, observaciones…"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--borde-cristal)]">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddOpen(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editing ? 'Guardar cambios' : 'Crear atleta'}</Button>
          </div>
        </div>
      </PremiumModal>

      <ConfirmDialog
        open={!!deletingId}
        title="Eliminar atleta"
        message="Esta acción quita al atleta del padrón local. ¿Continuar?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onCancel={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) deleteAthlete(deletingId);
          setDeletingId(null);
        }}
      />
    </div>
  );
};
