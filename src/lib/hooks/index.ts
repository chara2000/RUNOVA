// Re-export all hooks from one place
export { useAuth } from './useAuth';
export type { AuthUser, UseAuthReturn } from './useAuth';

export { useAthletes, useAthlete, useMyAthlete } from './useAthletes';
export type { AthleteWithSummary } from './useAthletes';

export { useWorkouts, useMyWorkouts } from './useWorkouts';
export type { WorkoutWithBlocks, WorkoutAssignmentWithWorkout } from './useWorkouts';

export { useActivities, useWeeklySummary, useActivityInbox } from './useActivities';

export { useRaces } from './useRaces';
export type { RaceWithMilestones } from './useRaces';

export { useNotifications, createNotification } from './useNotifications';

export { useDevices } from './useDevices';
