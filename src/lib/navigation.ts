/**
 * RUNOVA — navegación tipada, permisos por rol y sync URL
 */

export type ActiveRole = 'athlete' | 'coach' | 'club';

export type ActiveView =
  | 'login'
  | 'dashboard'
  | 'profile'
  | 'workouts'
  | 'plan-vs-real'
  | 'performance'
  | 'athletes'
  | 'devices'
  | 'inbox'
  | 'races'
  | 'import'
  | 'reports'
  | 'ai'
  | 'live';

const ALL_VIEWS: ActiveView[] = [
  'login',
  'dashboard',
  'profile',
  'workouts',
  'plan-vs-real',
  'performance',
  'athletes',
  'devices',
  'inbox',
  'races',
  'import',
  'reports',
  'ai',
  'live',
];

/** Vistas permitidas por rol (login es gate, no módulo). */
export const ROLE_VIEWS: Record<ActiveRole, ActiveView[]> = {
  athlete: [
    'dashboard',
    'profile',
    'workouts',
    'plan-vs-real',
    'performance',
    'devices',
    'inbox',
    'races',
    'import',
    'reports',
    'ai',
    'live',
  ],
  coach: [
    'dashboard',
    'athletes',
    'workouts',
    'plan-vs-real',
    'performance',
    'devices',
    'inbox',
    'races',
    'reports',
    'ai',
    'live',
    'profile',
  ],
  club: [
    'dashboard',
    'athletes',
    'races',
    'devices',
    'reports',
    'ai',
    'profile',
  ],
};

export function isActiveView(v: string): v is ActiveView {
  return (ALL_VIEWS as string[]).includes(v);
}

export function isActiveRole(r: string): r is ActiveRole {
  return r === 'athlete' || r === 'coach' || r === 'club';
}

export function canAccessView(role: ActiveRole, view: ActiveView): boolean {
  if (view === 'login') return true;
  return ROLE_VIEWS[role].includes(view);
}

export function resolveViewForRole(role: ActiveRole, view: ActiveView): ActiveView {
  if (view === 'login') return 'dashboard';
  if (canAccessView(role, view)) return view;
  return 'dashboard';
}

export function roleFromAuth(role: string | undefined | null): ActiveRole {
  const r = (role || '').toUpperCase();
  if (r === 'COACH') return 'coach';
  if (r === 'ADMIN' || r === 'CLUB') return 'club';
  return 'athlete';
}

export function readNavFromUrl(): { view: ActiveView; role: ActiveRole } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const viewRaw = params.get('view');
  const roleRaw = params.get('role');
  // Compat: URLs antiguas ?view=landing → login
  const normalized =
    viewRaw === 'landing' ? 'login' : viewRaw && isActiveView(viewRaw) ? viewRaw : null;
  const role = roleRaw && isActiveRole(roleRaw) ? roleRaw : null;
  if (!normalized && !role) return null;
  return {
    view: normalized || 'login',
    role: role || 'athlete',
  };
}

export function writeNavToUrl(view: ActiveView, role: ActiveRole) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (view === 'login') {
    params.delete('view');
    params.delete('role');
  } else {
    params.set('view', view);
    params.set('role', role);
  }
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', next);
}
