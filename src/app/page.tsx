'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { AthleteDashboardView } from '@/components/views/AthleteDashboardView';
import { CoachDashboardView } from '@/components/views/CoachDashboardView';
import { ClubDashboardView } from '@/components/views/ClubDashboardView';
import { AthleteProfileView } from '@/components/views/AthleteProfileView';
import { RunovaLiveView } from '@/components/views/RunovaLiveView';
import { WorkoutBuilderView } from '@/components/views/WorkoutBuilderView';
import { PlanVsRealView } from '@/components/views/PlanVsRealView';
import { PerformanceCenterView } from '@/components/views/PerformanceCenterView';
import { AthletesManagementView } from '@/components/views/AthletesManagementView';
import { RunovaConnectView } from '@/components/views/RunovaConnectView';
import { ActivityImportView } from '@/components/views/ActivityImportView';
import { ReportsView } from '@/components/views/ReportsView';
import { RunovaAiView } from '@/components/views/RunovaAiView';
import { SecureLoginView } from '@/components/views/SecureLoginView';
import { ActivityInboxView } from '@/components/views/ActivityInboxView';
import { RaceCenterView } from '@/components/views/RaceCenterView';
import { OnboardingView } from '@/components/views/OnboardingView';
import { RunovaProvider, useRunova } from '@/context/RunovaContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ZenithToaster, zenithToast } from '@/components/common/ZenithToaster';
import { CommandPalette, CommandItem, Skeleton, Button } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  ActiveRole,
  ActiveView,
  canAccessView,
  isActiveView,
  readNavFromUrl,
  resolveViewForRole,
  roleFromAuth,
  writeNavToUrl,
} from '@/lib/navigation';

function RunovaMainApp() {
  const { user, loading: authLoading, signOut, updateProfile } = useAuth();
  const { dataStatus, dataError, refreshAll } = useRunova();
  const [activeRole, setActiveRole] = useState<ActiveRole>('athlete');
  const [activeView, setActiveView] = useState<ActiveView>('login');
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fromUrl = readNavFromUrl();
    if (fromUrl) {
      setActiveView(fromUrl.view === 'login' ? 'login' : fromUrl.view);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setActiveView('login');
      return;
    }
    const role = roleFromAuth(user.role);
    setActiveRole(role);
    setActiveView((v) => {
      if (v === 'login') return 'dashboard';
      return resolveViewForRole(role, v);
    });
  }, [user, authLoading]);

  useEffect(() => {
    if (!hydrated || !user) return;
    writeNavToUrl(activeView === 'login' ? 'dashboard' : activeView, activeRole);
  }, [activeView, activeRole, hydrated, user]);

  const navigate = useCallback(
    (view: ActiveView | string) => {
      if (!isActiveView(view) || view === 'login') return;
      const next = resolveViewForRole(activeRole, view);
      if (next !== view) {
        zenithToast.info('Sin acceso', `Vista no disponible para tu rol.`);
      }
      setActiveView(next);
      setCommandOpen(false);
    },
    [activeRole]
  );

  const handleLogout = async () => {
    await signOut();
    setActiveRole('athlete');
    setActiveView('login');
    zenithToast.info('Sesión cerrada.');
  };

  const handleLoginSuccess = () => {
    zenithToast.success('Sesión iniciada');
    setActiveView('dashboard');
  };

  const userSession = user
    ? {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url ?? undefined,
        onboarding_completed: user.onboarding_completed,
      }
    : null;

  const commandItems: CommandItem[] = useMemo(() => {
    const base: { id: ActiveView; label: string; group: string; keywords?: string }[] = [
      { id: 'dashboard', label: 'Dashboard', group: 'Navegación' },
      { id: 'plan-vs-real', label: 'Plan vs Realizado', group: 'Navegación' },
      { id: 'performance', label: 'Rendimiento & Carga', group: 'Navegación', keywords: 'ctl atl tsb' },
      { id: 'workouts', label: 'Sesiones & Biblioteca', group: 'Navegación' },
      { id: 'live', label: 'Iniciar LIVE HUD', group: 'Acciones' },
      { id: 'races', label: 'Race Center', group: 'Navegación' },
      { id: 'inbox', label: 'Bandeja de Actividades', group: 'Navegación' },
      { id: 'devices', label: 'Dispositivos', group: 'Navegación' },
      { id: 'import', label: 'Importar FIT / GPX', group: 'Acciones' },
      { id: 'ai', label: 'AI Coach', group: 'Navegación' },
      { id: 'profile', label: 'Ficha del Atleta', group: 'Navegación' },
      { id: 'reports', label: 'Informes', group: 'Navegación' },
      { id: 'athletes', label: 'Gestión de Atletas', group: 'Coach / Club' },
    ];
    return base
      .filter((i) => canAccessView(activeRole, i.id))
      .map((i) => ({
        id: i.id,
        label: i.label,
        group: i.group,
        keywords: i.keywords,
        onSelect: () => navigate(i.id),
      }));
  }, [activeRole, navigate]);

  if (!isSupabaseConfigured) {
    return (
      <div className="h-dvh flex items-center justify-center p-8 bg-[var(--bg-base)]">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-display font-black uppercase tracking-tighter">
            Configuración requerida
          </h1>
          <p className="text-sm text-[var(--texto-secundario)]">
            Define <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{' '}
            <code className="font-mono text-xs">.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading || !hydrated) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[var(--bg-base)]">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!user || activeView === 'login') {
    return (
      <SecureLoginView
        onLoginSuccess={handleLoginSuccess}
        onCancel={() => setActiveView('login')}
      />
    );
  }

  if (user.role === 'ATHLETE' && !user.onboarding_completed) {
    return (
      <OnboardingView
        user={user}
        onComplete={async () => {
          try {
            await updateProfile({ onboarding_completed: true });
          } catch (e) {
            console.error(e);
          }
          zenithToast.success('Perfil configurado');
          setActiveView('dashboard');
          void refreshAll();
        }}
      />
    );
  }

  if (activeView === 'live') {
    return (
      <RunovaLiveView
        onFinishTraining={() => navigate('plan-vs-real')}
        onExit={() => navigate('dashboard')}
      />
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden selection:bg-[var(--brand-primario)] selection:text-black relative">
      <Navbar
        currentRole={activeRole}
        onOpenLive={() => navigate('live')}
        onOpenAi={() => navigate('ai')}
        onOpenLogin={() => setActiveView('login')}
        onOpenCommand={() => setCommandOpen(true)}
        userSession={userSession}
        onLogout={handleLogout}
        activeView={activeView}
        onSelectView={navigate}
      />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        items={commandItems}
      />

      <div
        className={cn(
          'flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden',
          sidebarCollapsed ? 'md:pl-[76px]' : 'md:pl-[272px]'
        )}
      >
        <Sidebar
          activeView={activeView}
          onSelectView={navigate}
          currentRole={activeRole}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          userSession={userSession}
        />

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-20 md:pb-6">
          {dataStatus === 'loading' && (
            <div className="rv-page space-y-4" aria-busy>
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {dataStatus === 'error' && (
            <div className="rv-page space-y-4">
              <p className="text-[var(--peligro)]">{dataError || 'Error cargando datos'}</p>
              <Button onClick={() => void refreshAll()}>Reintentar</Button>
            </div>
          )}
          {(dataStatus === 'ready' || dataStatus === 'idle') && (
            <>
              {activeView === 'dashboard' && activeRole === 'athlete' && (
                <AthleteDashboardView
                  onOpenLive={() => navigate('live')}
                  onSelectView={navigate}
                  athleteName={userSession?.full_name}
                />
              )}
              {activeView === 'dashboard' && activeRole === 'coach' && (
                <CoachDashboardView onSelectView={navigate} />
              )}
              {activeView === 'dashboard' && activeRole === 'club' && (
                <ClubDashboardView onSelectView={navigate} />
              )}
              {activeView === 'profile' && (
                <AthleteProfileView onSelectView={navigate} onOpenLive={() => navigate('live')} />
              )}
              {activeView === 'workouts' && (
                <WorkoutBuilderView
                  onSelectView={navigate}
                  onOpenLive={() => navigate('live')}
                />
              )}
              {activeView === 'plan-vs-real' && <PlanVsRealView onSelectView={navigate} />}
              {activeView === 'performance' && (
                <PerformanceCenterView onSelectView={navigate} />
              )}
              {activeView === 'athletes' && (
                <AthletesManagementView onSelectView={navigate} />
              )}
              {activeView === 'devices' && <RunovaConnectView onSelectView={navigate} />}
              {activeView === 'inbox' && <ActivityInboxView onSelectView={navigate} />}
              {activeView === 'races' && <RaceCenterView onSelectView={navigate} />}
              {activeView === 'import' && <ActivityImportView onSelectView={navigate} />}
              {activeView === 'reports' && <ReportsView onSelectView={navigate} />}
              {activeView === 'ai' && (
                <RunovaAiView onSelectView={navigate} onOpenLive={() => navigate('live')} />
              )}
            </>
          )}
        </main>
      </div>

      <BottomNav
        activeView={activeView}
        onSelectView={navigate}
        onOpenLive={() => navigate('live')}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <RunovaProvider>
        <ZenithToaster />
        <RunovaMainApp />
      </RunovaProvider>
    </ThemeProvider>
  );
}
