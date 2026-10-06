'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import type {
  Athlete,
  Workout,
  Activity,
  Device,
  ActivityInboxItem,
  Race,
  Club,
  Coach,
  Group,
  PlanVsActualComparison,
  Goal,
  WorkoutAssignment,
  RunovaReadinessState,
  PerformanceRadar,
  DigitalPerformancePoint,
  PerformanceEvolutionTrend,
} from '@/types/database';
import { runovaDb, isValidUUID } from '@/lib/dbService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { zenithToast } from '@/components/common/ZenithToaster';
import { useAuth } from '@/lib/hooks/useAuth';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export type DataStatus = 'idle' | 'ready' | 'loading' | 'error';

const EMPTY_CLUB: Club = {
  id: '',
  name: 'Sin club',
  slug: 'sin-club',
  location: '—',
  members_count: 0,
  head_coach_id: '',
  created_at: new Date().toISOString(),
};

const EMPTY_COACH: Coach = {
  id: '',
  user_id: '',
  club_id: '',
  specialty: 'General',
  athletes_count: 0,
};

const EMPTY_ATHLETE: Athlete = {
  id: '',
  user_id: '',
  club_id: '',
  coach_id: '',
  full_name: 'Sin atleta',
  date_of_birth: '2000-01-01',
  gender: 'OTHER',
  weight_kg: 0,
  height_cm: 0,
  level: 'Intermedio',
  running_years: 0,
  preferred_distance: '10K',
  hr_max: 190,
  hr_resting: 50,
  vo2_max: 0,
  vo2_max_source: 'estimated',
  threshold_pace: '—',
  cadence_target: 170,
  stride_length_cm: 120,
  status: 'no_data',
  ready_score: 0,
  acute_load: 0,
  chronic_load: 0,
  acwr: 0,
  compliance_rate: 0,
  zones: {
    zone1: { min: 100, max: 120, label: 'Recuperación' },
    zone2: { min: 121, max: 140, label: 'Aeróbico' },
    zone3: { min: 141, max: 160, label: 'Tempo' },
    zone4: { min: 161, max: 175, label: 'Umbral' },
    zone5: { min: 176, max: 195, label: 'Máxima' },
  },
  records: {},
  created_at: new Date().toISOString(),
};

const EMPTY_WORKOUT: Workout = {
  id: '',
  title: 'Sin sesión',
  category: 'Rodaje',
  target_date: new Date().toISOString().slice(0, 10),
  coach_id: '',
  total_distance_km: 0,
  estimated_duration_min: 0,
  target_pace: '—',
  target_hr_zone: '—',
  objective: '',
  blocks: [],
  created_at: new Date().toISOString(),
};

const EMPTY_PLAN: PlanVsActualComparison = {
  workout_id: '',
  activity_id: '',
  athlete_name: '—',
  workout_title: 'Sin comparación',
  date: '—',
  planned: { distance_km: 0, pace: '—', duration_min: 0, hr_zone: '—', cadence: 0 },
  actual: { distance_km: 0, pace: '—', duration_min: 0, hr_zone: '—', cadence: 0, avg_hr: 0 },
  compliance: {
    overall_score: 0,
    distance_diff_km: 0,
    pace_diff_sec: 0,
    pace_status: 'on_target',
    hr_adherence: 0,
  },
};

const EMPTY_READINESS: RunovaReadinessState = {
  score: 0,
  is_limited: true,
  category_label: 'READINESS LIMITADO',
  subscores: {
    recovery: { value: 0, weight_pct: 25, label: 'Recuperación', status: 'missing' },
    load: { value: 0, weight_pct: 25, label: 'Carga', status: 'missing' },
    trend: { value: 0, weight_pct: 25, label: 'Tendencia', status: 'missing' },
    sleep: { value: 0, weight_pct: 25, label: 'Sueño', status: 'missing' },
  },
  missing_factors: ['Sin datos de atleta'],
  formula_explanation: 'Ready score basado en carga, cumplimiento y métricas fisiológicas.',
  disclaimer: 'Indicador orientativo. No sustituye valoración médica.',
};

const EMPTY_RADAR: PerformanceRadar = {
  aerobic: 0,
  speed: 0,
  endurance: 0,
  consistency: 0,
  load_management: 0,
  recovery: 0,
  overall_index: 0,
};

const AI_PROMPTS = [
  'Resume mi semana de entrenamiento y fatiga acumulada',
  '¿Cómo evolucionó mi carga en el último mes?',
  'Atletas con riesgo de sobrecarga o bajo cumplimiento',
  'Explicar mi última sesión y eficiencia de cadencia',
  'Comparar mi volumen de los últimos 30 días con el mes anterior',
];

interface RunovaContextType {
  athletes: Athlete[];
  workouts: Workout[];
  activities: Activity[];
  inboxActivities: ActivityInboxItem[];
  races: Race[];
  devices: Device[];
  selectedAthlete: Athlete;
  toasts: ToastMessage[];
  club: Club;
  coach: Coach;
  groups: Group[];
  todayWorkout: Workout;
  planVsReal: PlanVsActualComparison;
  goals: Goal[];
  readiness: RunovaReadinessState;
  performanceRadar: PerformanceRadar;
  digitalPoints: DigitalPerformancePoint[];
  evolutionTimeline: PerformanceEvolutionTrend[];
  aiPrompts: string[];
  assignments: WorkoutAssignment[];
  dataStatus: DataStatus;
  dataError: string | null;
  refreshAll: () => Promise<void>;
  addAthlete: (data: Partial<Athlete>) => Promise<Athlete>;
  updateAthlete: (id: string, updates: Partial<Athlete>) => Promise<void>;
  deleteAthlete: (id: string) => Promise<void>;
  selectAthlete: (id: string) => void;
  addWorkout: (data: Partial<Workout>) => Promise<Workout>;
  updateWorkout: (id: string, updates: Partial<Workout>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  assignWorkout: (workoutId: string, athleteIds: string[], groupId?: string) => Promise<void>;
  addActivity: (data: Partial<Activity>) => Promise<Activity>;
  deleteActivity: (id: string) => Promise<void>;
  saveInboxActivity: (item: ActivityInboxItem) => Promise<void>;
  discardInboxActivity: (id: string) => Promise<void>;
  enqueueImport: (item: Partial<ActivityInboxItem>) => Promise<ActivityInboxItem>;
  addRace: (data: Partial<Race>) => Promise<Race>;
  updateRace: (id: string, updates: Partial<Race>) => Promise<void>;
  deleteRace: (id: string) => Promise<void>;
  addDevice: (data: Partial<Device>) => Promise<Device>;
  assignDevice: (deviceId: string, athleteId: string) => Promise<void>;
  releaseDevice: (deviceId: string) => Promise<void>;
  deleteDevice: (deviceId: string) => Promise<void>;
  notify: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

const RunovaContext = createContext<RunovaContextType | undefined>(undefined);

function buildReadiness(athlete: Athlete): RunovaReadinessState {
  if (!athlete.id) return EMPTY_READINESS;
  const score = athlete.ready_score || 0;
  const limited = score < 60 || athlete.status === 'attention' || athlete.status === 'review';
  return {
    score,
    is_limited: limited,
    category_label: limited
      ? score < 40
        ? 'READINESS LIMITADO'
        : 'RECUPERACIÓN RECOMENDADA'
      : 'LISTO PARA ENTRENAR',
    subscores: {
      recovery: {
        value: Math.min(100, Math.max(0, Math.round(100 - (athlete.acwr - 1) * 80))),
        weight_pct: 25,
        label: 'Recuperación',
        status: athlete.acwr > 1.3 ? 'low' : 'optimal',
      },
      load: {
        value: Math.min(100, Math.round(athlete.acute_load / 6)),
        weight_pct: 25,
        label: 'Carga',
        status: 'moderate',
      },
      trend: {
        value: Math.min(100, athlete.compliance_rate),
        weight_pct: 25,
        label: 'Cumplimiento',
        status: athlete.compliance_rate < 70 ? 'low' : 'optimal',
      },
      sleep: {
        value: Math.min(100, athlete.hrv_baseline_ms || 50),
        weight_pct: 25,
        label: 'HRV',
        status: 'moderate',
      },
    },
    missing_factors: [],
    formula_explanation: 'Ready score del perfil + ACWR + cumplimiento.',
    disclaimer: 'Indicador orientativo. No sustituye valoración médica.',
  };
}

function buildPlanVsReal(
  athlete: Athlete,
  workouts: Workout[],
  activities: Activity[]
): PlanVsActualComparison {
  const act = activities[0];
  const wkt = workouts.find((w) => w.id === act?.workout_id) || workouts[0];
  if (!act || !wkt) return EMPTY_PLAN;

  // Real distance compliance
  const plannedDist = wkt.total_distance_km || 0;
  const actualDist = act.distance_km || 0;
  const distDiff = Number((actualDist - plannedDist).toFixed(2));
  const distScore = plannedDist > 0 ? Math.min(100, Math.round(100 - Math.abs(distDiff / plannedDist) * 100)) : 100;

  // Real pace compliance — parse "mm:ss" strings to seconds
  function paceToSec(pace: string | null | undefined): number {
    if (!pace || pace === '—') return 0;
    const parts = pace.split(':').map(Number);
    return parts.length === 2 ? parts[0] * 60 + (parts[1] || 0) : 0;
  }
  const plannedPaceSec = paceToSec(wkt.target_pace);
  const actualPaceSec = paceToSec(act.avg_pace);
  const paceDiffSec = plannedPaceSec && actualPaceSec ? actualPaceSec - plannedPaceSec : 0;
  const paceScore =
    plannedPaceSec && actualPaceSec
      ? Math.min(100, Math.round(100 - Math.abs(paceDiffSec / plannedPaceSec) * 100))
      : 100;
  const paceStatus: 'on_target' | 'faster' | 'slower' =
    Math.abs(paceDiffSec) < 10 ? 'on_target' : paceDiffSec < 0 ? 'faster' : 'slower';

  // Real HR adherence — compare avg HR against zone targets
  const avgHr = act.avg_heart_rate || 0;
  const zone4min = athlete.zones?.zone4?.min || 0;
  const zone4max = athlete.zones?.zone4?.max || 0;
  const hrAdherence =
    avgHr && zone4min && zone4max
      ? avgHr >= zone4min && avgHr <= zone4max
        ? 100
        : Math.min(100, Math.round(100 - Math.abs(avgHr - (zone4min + zone4max) / 2) / ((zone4max - zone4min) / 2 || 1) * 50))
      : 80; // no data — neutral

  const overallScore = Math.round((distScore * 0.5) + (paceScore * 0.3) + (hrAdherence * 0.2));

  return {
    workout_id: wkt.id,
    activity_id: act.id,
    athlete_name: athlete.full_name,
    workout_title: wkt.title,
    date: act.start_time?.slice(0, 10) || '—',
    planned: {
      distance_km: wkt.total_distance_km,
      pace: wkt.target_pace,
      duration_min: wkt.estimated_duration_min,
      hr_zone: wkt.target_hr_zone,
      cadence: athlete.cadence_target,
    },
    actual: {
      distance_km: act.distance_km,
      pace: act.avg_pace,
      duration_min: Math.round((act.duration_sec || 0) / 60),
      hr_zone: `FC ${act.avg_heart_rate || '—'}`,
      cadence: act.avg_cadence || 0,
      avg_hr: act.avg_heart_rate || 0,
    },
    compliance: {
      overall_score: overallScore,
      distance_diff_km: distDiff,
      pace_diff_sec: paceDiffSec,
      pace_status: paceStatus,
      hr_adherence: hrAdherence,
    },
    feedback: act.notes,
  };
}

function buildDigitalPoints(
  activities: Activity[],
  athleteId: string
): DigitalPerformancePoint[] {
  if (!athleteId) return [];
  const mine = activities
    .filter((a) => a.athlete_id === athleteId)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  if (mine.length === 0) return [];

  const byDay = new Map<string, { km: number; load: number }>();
  for (const a of mine) {
    const day = a.start_time.slice(0, 10);
    const te = a.training_effect;
    const load = te
      ? (te.aerobic + te.anaerobic) * 20
      : a.distance_km * 10 + (a.duration_sec / 60) * 0.5;
    const prev = byDay.get(day) || { km: 0, load: 0 };
    byDay.set(day, { km: prev.km + a.distance_km, load: prev.load + load });
  }

  const points: DigitalPerformancePoint[] = [];
  let ctl = 0;
  let atl = 0;
  const today = new Date();
  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayData = byDay.get(key) || { km: 0, load: 0 };
    ctl += (dayData.load - ctl) / 42;
    atl += (dayData.load - atl) / 7;
    points.push({
      date: key,
      day_label: i === 0 ? 'Hoy' : key.slice(5),
      fitness_ctl: Math.round(ctl),
      fatigue_atl: Math.round(atl),
      form_tsb: Math.round(ctl - atl),
      daily_load: Math.round(dayData.load),
      mileage_km: Number(dayData.km.toFixed(1)),
    });
  }
  return points;
}

function buildEvolution(
  athlete: Athlete,
  activities: Activity[]
): PerformanceEvolutionTrend[] {
  if (!athlete.id) return [];
  const mine = activities.filter((a) => a.athlete_id === athlete.id);
  const volume =
    mine.length > 0
      ? Number(
          (
            mine.reduce((s, a) => s + a.distance_km, 0) /
            Math.max(1, mine.length / 7)
          ).toFixed(1)
        )
      : Math.round((athlete.chronic_load || 0) / 10);
  return [
    {
      month: 'Actual',
      vo2_max: athlete.vo2_max || 0,
      pace_min_km: athlete.threshold_pace || '—',
      volume_km: volume,
      avg_hr_threshold: athlete.zones?.zone4?.min || 0,
      consistency_pct: athlete.compliance_rate || 0,
      notes: 'Snapshot del perfil y actividades registradas.',
    },
  ];
}

export const RunovaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [inboxActivities, setInboxActivities] = useState<ActivityInboxItem[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete>(EMPTY_ATHLETE);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [club, setClub] = useState<Club>(EMPTY_CLUB);
  const [coach, setCoach] = useState<Coach>(EMPTY_COACH);
  const [groups, setGroups] = useState<Group[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);
  const [dataStatus, setDataStatus] = useState<DataStatus>('idle');
  const [dataError, setDataError] = useState<string | null>(null);

  const notify = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      const titles = { success: 'Listo', info: 'Aviso', warning: 'Atención', error: 'Error' } as const;
      zenithToast[type]?.(titles[type], message);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setDataStatus(user ? 'error' : 'idle');
      if (user && !isSupabaseConfigured) {
        setDataError('Supabase no configurado');
      }
      return;
    }
    setDataStatus('loading');
    setDataError(null);
    try {
      // Bootstrap club only for coaches / admins
      let clubId: string | undefined;
      if (user.role === 'COACH' || user.role === 'ADMIN') {
        try {
          const boot = await runovaDb.bootstrapClubIfNeeded(user.id, {
            clubName: `${user.full_name || 'RUNOVA'} Club`,
          });
          clubId = boot.club.id;
          setClub({ ...boot.club, members_count: 0 });
        } catch (bootErr) {
          console.warn('bootstrapClubIfNeeded', bootErr);
        }
      } else {
        const c = await runovaDb.getClub();
        if (c) {
          clubId = c.id;
          setClub(c);
        }
      }

      const [
        athList,
        wktList,
        actList,
        inboxList,
        raceList,
        deviceList,
        groupList,
        assignList,
      ] = await Promise.all([
        runovaDb.listAthletes(),
        runovaDb.listWorkouts(),
        runovaDb.listActivities(),
        runovaDb.listInbox(),
        runovaDb.listRaces(),
        runovaDb.listDevices(),
        runovaDb.listGroups(clubId),
        runovaDb.listAssignments(),
      ]);

      setAthletes(athList);
      setWorkouts(wktList);
      setActivities(actList);
      setInboxActivities(inboxList);
      setRaces(raceList);
      setDevices(deviceList);
      setGroups(groupList);
      setAssignments(assignList);
      setClub((prev) => ({ ...prev, members_count: athList.length }));

      // Coach row for current user
      const { data: coachRow } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (coachRow) {
        setCoach({
          id: coachRow.id,
          user_id: coachRow.user_id,
          club_id: coachRow.club_id || '',
          specialty: coachRow.specialty || 'General',
          license_number: coachRow.license_number,
          bio: coachRow.bio,
          athletes_count: athList.length,
        });
      }

      const mine =
        athList.find((a) => a.user_id === user.id) ||
        athList[0] ||
        EMPTY_ATHLETE;
      setSelectedAthlete(mine);
      if (mine.id) {
        const g = await runovaDb.listGoals(mine.id);
        setGoals(g);
      } else {
        setGoals([]);
      }
      setDataStatus('ready');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error cargando datos';
      setDataError(msg);
      setDataStatus('error');
      notify(msg, 'error');
    }
  }, [user, notify]);

  useEffect(() => {
    if (user) void refreshAll();
    else {
      setAthletes([]);
      setWorkouts([]);
      setActivities([]);
      setInboxActivities([]);
      setRaces([]);
      setDevices([]);
      setGroups([]);
      setGoals([]);
      setAssignments([]);
      setSelectedAthlete(EMPTY_ATHLETE);
      setClub(EMPTY_CLUB);
      setCoach(EMPTY_COACH);
      setDataStatus('idle');
    }
  }, [user, refreshAll]);

  const todayWorkout = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return workouts.find((w) => w.target_date === today) || workouts[0] || EMPTY_WORKOUT;
  }, [workouts]);

  const planVsReal = useMemo(
    () => buildPlanVsReal(selectedAthlete, workouts, activities),
    [selectedAthlete, workouts, activities]
  );

  const readiness = useMemo(() => buildReadiness(selectedAthlete), [selectedAthlete]);

  const performanceRadar = useMemo<PerformanceRadar>(() => {
    if (!selectedAthlete.id) return EMPTY_RADAR;
    return {
      aerobic: Math.min(100, Math.round(selectedAthlete.vo2_max * 1.5)),
      speed: Math.min(100, selectedAthlete.compliance_rate),
      endurance: Math.min(100, Math.round(selectedAthlete.chronic_load / 5)),
      consistency: Math.min(100, selectedAthlete.compliance_rate),
      load_management: Math.min(100, Math.round(110 - selectedAthlete.acwr * 40)),
      recovery: Math.min(100, selectedAthlete.ready_score),
      overall_index: selectedAthlete.ready_score,
    };
  }, [selectedAthlete]);

  const digitalPoints = useMemo(
    () => buildDigitalPoints(activities, selectedAthlete.id),
    [activities, selectedAthlete.id]
  );

  const evolutionTimeline = useMemo(
    () => buildEvolution(selectedAthlete, activities),
    [selectedAthlete, activities]
  );

  const selectAthlete = (id: string) => {
    const found = athletes.find((a) => a.id === id);
    if (found) {
      setSelectedAthlete(found);
      void runovaDb.listGoals(found.id).then(setGoals).catch(() => setGoals([]));
    }
  };

  const addAthlete = async (data: Partial<Athlete>): Promise<Athlete> => {
    const created = await runovaDb.createAthlete({
      ...data,
      club_id: data.club_id || club.id || undefined,
      coach_id: data.coach_id || coach.id || undefined,
    });
    setAthletes((prev) => [created, ...prev]);
    notify(`Atleta "${created.full_name}" registrado.`);
    return created;
  };

  const updateAthlete = async (id: string, updates: Partial<Athlete>): Promise<void> => {
    const { error } = await supabase.from('athletes').update({
      full_name: updates.full_name,
      level: updates.level,
      preferred_distance: updates.preferred_distance,
      gender: updates.gender,
      date_of_birth: updates.date_of_birth,
      weight_kg: updates.weight_kg,
      height_cm: updates.height_cm,
      status: updates.status,
      hr_max: updates.hr_max,
      hr_resting: updates.hr_resting,
      vo2_max: updates.vo2_max,
      threshold_pace: updates.threshold_pace,
      medical_notes: (updates as { notes?: string }).notes,
    }).eq('id', id);
    if (error) throw new Error(error.message);
    setAthletes((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    if (selectedAthlete.id === id) setSelectedAthlete((prev) => ({ ...prev, ...updates }));
    notify('Ficha del atleta actualizada.');
  };

  const deleteAthlete = async (id: string): Promise<void> => {
    const target = athletes.find((a) => a.id === id);
    const { error } = await supabase
      .from('athletes')
      .update({ soft_deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      const hard = await supabase.from('athletes').delete().eq('id', id);
      if (hard.error) throw new Error(hard.error.message);
    }
    setAthletes((prev) => prev.filter((a) => a.id !== id));
    notify(`Atleta "${target?.full_name || id}" eliminado.`, 'info');
  };

  const addWorkout = async (data: Partial<Workout>): Promise<Workout> => {
    const coachId = coach.id;
    if (!coachId) throw new Error('Necesitas perfil de coach para crear sesiones.');
    const created = await runovaDb.createWorkout({
      title: data.title || 'Nueva sesión',
      target_date: data.target_date || new Date().toISOString().slice(0, 10),
      category: data.category || 'Rodaje',
      total_distance_km: data.total_distance_km ?? 0,
      estimated_duration_min: data.estimated_duration_min ?? 0,
      target_pace: data.target_pace || '—',
      target_hr_zone: data.target_hr_zone || '—',
      objective: data.objective,
      group_id: data.group_id,
      coach_id: coachId,
      blocks: data.blocks,
    });
    setWorkouts((prev) => [created, ...prev]);
    notify(`Sesión "${created.title}" guardada.`);
    return created;
  };

  const updateWorkout = async (id: string, updates: Partial<Workout>): Promise<void> => {
    await runovaDb.updateWorkout(id, updates);
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    notify('Sesión actualizada.');
  };

  const deleteWorkout = async (id: string): Promise<void> => {
    const target = workouts.find((w) => w.id === id);
    await runovaDb.deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    notify(`Sesión "${target?.title || id}" eliminada.`, 'info');
  };

  const assignWorkout = async (
    workoutId: string,
    athleteIds: string[],
    groupId?: string
  ): Promise<void> => {
    if (!workoutId || !athleteIds.length) {
      notify('Selecciona al menos un atleta para asignar la sesión.', 'warning');
      return;
    }
    if (!isValidUUID(workoutId)) {
      notify('El ID de la sesión no es válido para guardar en el servidor.', 'error');
      return;
    }
    try {
      const rows = await runovaDb.assignWorkout(workoutId, athleteIds);
      setAssignments((prev) => [
        ...rows,
        ...prev.filter((a) => a.workout_id !== workoutId || !athleteIds.includes(a.athlete_id)),
      ]);
      if (groupId && isValidUUID(groupId)) {
        await runovaDb.updateWorkout(workoutId, { group_id: groupId });
      }
      notify(`Sesión asignada a ${athleteIds.length} atleta(s).`);
    } catch (err: any) {
      console.error('Error al asignar sesión:', err);
      notify(`No se pudo asignar la sesión: ${err?.message || 'Error'}`, 'error');
    }
  };

  const addActivity = async (data: Partial<Activity>): Promise<Activity> => {
    const created = await runovaDb.createActivity({
      athlete_id: data.athlete_id || selectedAthlete.id,
      title: data.title || 'Actividad',
      start_time: data.start_time || new Date().toISOString(),
      distance_km: data.distance_km ?? 0,
      duration_sec: data.duration_sec ?? 0,
      avg_pace: data.avg_pace || '—',
      format: data.format,
      workout_id: data.workout_id,
      device_id: data.device_id,
      max_pace: data.max_pace,
      avg_speed_kmh: data.avg_speed_kmh,
      max_speed_kmh: data.max_speed_kmh,
      elevation_gain_m: data.elevation_gain_m,
      elevation_loss_m: data.elevation_loss_m,
      calories: data.calories,
      avg_heart_rate: data.avg_heart_rate,
      max_heart_rate: data.max_heart_rate,
      avg_cadence: data.avg_cadence,
      notes: data.notes,
      is_matched: data.is_matched,
    });
    setActivities((prev) => [created, ...prev]);
    notify(`Actividad "${created.title}" registrada.`);
    return created;
  };

  const deleteActivity = async (id: string): Promise<void> => {
    await runovaDb.deleteActivity(id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
    notify('Actividad eliminada.', 'info');
  };

  const saveInboxActivity = async (item: ActivityInboxItem): Promise<void> => {
    const created = await runovaDb.saveInboxToActivity(item);
    setActivities((prev) => [created, ...prev]);
    setInboxActivities((prev) => prev.filter((a) => a.id !== item.id));
    notify(`"${item.title}" guardada en historial.`);
  };

  const discardInboxActivity = async (id: string): Promise<void> => {
    const target = inboxActivities.find((a) => a.id === id);
    await runovaDb.discardInbox(id);
    setInboxActivities((prev) => prev.filter((a) => a.id !== id));
    notify(`"${target?.title || id}" descartada.`, 'info');
  };

  const enqueueImport = async (
    item: Partial<ActivityInboxItem>
  ): Promise<ActivityInboxItem> => {
    const row = await runovaDb.createInboxItem({
      athlete_id: item.athlete_id || selectedAthlete.id,
      athlete_name: item.athlete_name || selectedAthlete.full_name,
      title: item.title || 'Actividad importada',
      raw_source: item.raw_source || 'FIT File',
      activity_date: item.activity_date || new Date().toISOString().slice(0, 10),
      device_model: item.device_model,
      distance_km: item.distance_km,
      duration_sec: item.duration_sec,
      duration_formatted: item.duration_formatted,
      avg_pace: item.avg_pace,
      avg_heart_rate: item.avg_heart_rate,
      max_heart_rate: item.max_heart_rate,
      avg_cadence: item.avg_cadence,
      elevation_gain_m: item.elevation_gain_m,
      calories: item.calories,
      suggested_workout_id: item.suggested_workout_id || todayWorkout.id || undefined,
      suggested_workout_title: item.suggested_workout_title || todayWorkout.title,
      match_confidence_pct: item.match_confidence_pct,
      notes: item.notes,
    });
    setInboxActivities((prev) => [row, ...prev]);
    notify('Importación en cola · valida en Inbox.', 'info');
    return row;
  };

  const addRace = async (data: Partial<Race>): Promise<Race> => {
    const created = await runovaDb.createRace({
      athlete_id: data.athlete_id || selectedAthlete.id,
      name: data.name || 'Nueva carrera',
      distance_km: data.distance_km ?? 10,
      event_date: data.event_date || new Date().toISOString(),
      category: data.category || '10K',
      location: data.location,
      target_time: data.target_time,
      target_pace: data.target_pace,
      pr_time: data.pr_time,
      preparation_score: data.preparation_score,
      status: data.status,
      notes: data.notes,
    });
    setRaces((prev) => [created, ...prev]);
    notify(`Carrera "${created.name}" registrada.`);
    return created;
  };

  const updateRace = async (id: string, updates: Partial<Race>): Promise<void> => {
    await runovaDb.updateRace(id, updates);
    setRaces((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    notify('Carrera actualizada.');
  };

  const deleteRace = async (id: string): Promise<void> => {
    const target = races.find((r) => r.id === id);
    await runovaDb.deleteRace(id);
    setRaces((prev) => prev.filter((r) => r.id !== id));
    notify(`Carrera "${target?.name || id}" eliminada.`, 'info');
  };

  const addDevice = async (data: Partial<Device>): Promise<Device> => {
    if (!user) throw new Error('Sesión requerida');
    const created = await runovaDb.createDevice({
      ...data,
      owner_id: user.id,
      name: data.name || 'Dispositivo',
      brand: data.brand || 'Generic',
      model: data.model || '—',
      type: data.type || 'smartwatch',
    });
    setDevices((prev) => [created, ...prev]);
    notify(`Dispositivo "${created.name}" añadido.`);
    return created;
  };

  const assignDevice = async (deviceId: string, athleteId: string): Promise<void> => {
    if (!coach.id) throw new Error('Perfil coach requerido para prestar dispositivos.');
    await runovaDb.assignDevice({
      device_id: deviceId,
      athlete_id: athleteId,
      coach_id: coach.id,
    });
    const ath = athletes.find((a) => a.id === athleteId);
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              is_assigned: true,
              status: 'assigned',
              current_athlete_name: ath?.full_name,
            }
          : d
      )
    );
    notify(`Dispositivo asignado a ${ath?.full_name || 'atleta'}.`);
  };

  const releaseDevice = async (deviceId: string): Promise<void> => {
    await runovaDb.releaseDevice(deviceId);
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, is_assigned: false, status: 'idle', current_athlete_name: undefined }
          : d
      )
    );
    notify('Dispositivo liberado al pool.');
  };

  const deleteDevice = async (deviceId: string): Promise<void> => {
    await runovaDb.deleteDevice(deviceId);
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    notify('Dispositivo eliminado.', 'info');
  };

  const value: RunovaContextType = {
    athletes,
    workouts,
    activities,
    inboxActivities,
    races,
    devices,
    selectedAthlete,
    toasts,
    club,
    coach,
    groups,
    todayWorkout,
    planVsReal,
    goals,
    readiness,
    performanceRadar,
    digitalPoints,
    evolutionTimeline,
    aiPrompts: AI_PROMPTS,
    assignments,
    dataStatus,
    dataError,
    refreshAll,
    addAthlete,
    updateAthlete,
    deleteAthlete,
    selectAthlete,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    assignWorkout,
    addActivity,
    deleteActivity,
    saveInboxActivity,
    discardInboxActivity,
    enqueueImport,
    addRace,
    updateRace,
    deleteRace,
    addDevice,
    assignDevice,
    releaseDevice,
    deleteDevice,
    notify,
    removeToast,
  };

  return <RunovaContext.Provider value={value}>{children}</RunovaContext.Provider>;
};

export const useRunova = () => {
  const context = useContext(RunovaContext);
  if (!context) throw new Error('useRunova must be used within a RunovaProvider');
  return context;
};
