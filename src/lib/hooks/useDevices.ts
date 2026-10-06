'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DbDevice, DbDeviceAssignment } from '@/types/database';

export interface DeviceWithAssignment extends DbDevice {
  currentAssignment?: DbDeviceAssignment & {
    athletes?: { full_name: string | null };
  };
}

interface UseDevicesReturn {
  devices: DeviceWithAssignment[];
  coachDevices: DeviceWithAssignment[];
  athleteDevices: DeviceWithAssignment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addDevice: (data: Partial<DbDevice>) => Promise<DbDevice>;
  assignDevice: (deviceId: string, athleteId: string, coachId: string) => Promise<void>;
  releaseDevice: (deviceId: string) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
}

export function useDevices(coachId?: string): UseDevicesReturn {
  const [devices, setDevices] = useState<DeviceWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('devices')
      .select(`
        *,
        device_assignments!device_assignments_device_id_fkey(
          *,
          athletes(full_name)
        )
      `)
      .order('name', { ascending: true });

    if (coachId) query = query.eq('owner_id', coachId);

    const { data, error: dbError } = await query;
    if (dbError) setError(dbError.message);
    else setDevices(data ?? []);
    setLoading(false);
  }, [coachId]);

  useEffect(() => { fetch(); }, [fetch]);

  const coachDevices = devices.filter(d => d.is_coach_owned);
  const athleteDevices = devices.filter(d => !d.is_coach_owned);

  const addDevice = useCallback(async (data: Partial<DbDevice>): Promise<DbDevice> => {
    const { data: device, error: dbError } = await supabase
      .from('devices')
      .insert({
        name: data.name ?? 'Nuevo Dispositivo',
        brand: data.brand ?? 'Garmin',
        model: data.model ?? '',
        type: data.type ?? 'smartwatch',
        serial_number: data.serial_number ?? null,
        battery_level: data.battery_level ?? 100,
        is_coach_owned: data.is_coach_owned ?? true,
        owner_id: data.owner_id!,
        is_assigned: false,
        device_status: 'idle',
      })
      .select()
      .single();

    if (dbError || !device) throw new Error(dbError?.message ?? 'Error al agregar dispositivo');
    setDevices(prev => [device, ...prev]);
    return device;
  }, []);

  const assignDevice = useCallback(async (
    deviceId: string,
    athleteId: string,
    coachId: string
  ) => {
    // Create assignment record
    const { error: aError } = await supabase
      .from('device_assignments')
      .insert({
        device_id: deviceId,
        athlete_id: athleteId,
        coach_id: coachId,
      });
    if (aError) throw new Error(aError.message);

    // Update device status
    const { error: dError } = await supabase
      .from('devices')
      .update({ is_assigned: true, device_status: 'assigned' })
      .eq('id', deviceId);
    if (dError) throw new Error(dError.message);

    await fetch();
  }, [fetch]);

  const releaseDevice = useCallback(async (deviceId: string) => {
    // Close open assignment
    const { error: aError } = await supabase
      .from('device_assignments')
      .update({ released_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .is('released_at', null);
    if (aError) throw new Error(aError.message);

    // Update device status
    const { error: dError } = await supabase
      .from('devices')
      .update({ is_assigned: false, device_status: 'idle' })
      .eq('id', deviceId);
    if (dError) throw new Error(dError.message);

    await fetch();
  }, [fetch]);

  const deleteDevice = useCallback(async (id: string) => {
    const { error: dbError } = await supabase.from('devices').delete().eq('id', id);
    if (dbError) throw new Error(dbError.message);
    setDevices(prev => prev.filter(d => d.id !== id));
  }, []);

  return {
    devices, coachDevices, athleteDevices,
    loading, error, refetch: fetch,
    addDevice, assignDevice, releaseDevice, deleteDevice,
  };
}
