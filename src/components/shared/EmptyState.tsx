'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { EmptyState as UiEmptyState } from '@/components/ui/Feedback';

interface EmptyStateProps {
  title?: string;
  titulo?: string;
  description?: string;
  descripcion?: string;
  icon?: LucideIcon;
  Icono?: LucideIcon;
  actionText?: string;
  textoBoton?: string;
  onAction?: () => void;
  onClick?: () => void;
  accentColor?: string;
}

/** Compat GymCRM + RUNOVA */
export function EmptyState({
  title,
  titulo,
  description,
  descripcion,
  icon,
  Icono,
  actionText,
  textoBoton,
  onAction,
  onClick,
}: EmptyStateProps) {
  const Icon = icon || Icono;
  return (
    <UiEmptyState
      title={title || titulo || ''}
      description={description || descripcion || ''}
      icon={Icon}
      actionLabel={actionText || textoBoton}
      onAction={onAction || onClick}
    />
  );
}
