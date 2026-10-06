import { supabase } from './supabase';

export interface MobileDevice {
  id: string;
  name: string;
  brand: string;
  model: string;
  type: 'heart_rate' | 'watch' | 'pod' | 'smart_shoe' | 'other';
  serial_number?: string;
  battery_level: number;
  is_coach_owned: boolean;
  is_assigned?: boolean;
  status: 'connected' | 'idle' | 'assigned' | 'disconnected';
  last_sync_at?: string;
  rssi?: number;
}

// Fallback high-fidelity sample devices in case offline / initial load
export const INITIAL_DEVICES: MobileDevice[] = [
  {
    id: 'dev-polar-h10',
    name: 'Polar H10 Dual Band',
    brand: 'Polar',
    model: 'H10-8C92',
    type: 'heart_rate',
    serial_number: 'SN-PLR-8842',
    battery_level: 94,
    is_coach_owned: false,
    status: 'connected',
    last_sync_at: new Date().toISOString(),
    rssi: -52,
  },
  {
    id: 'dev-garmin-hrm',
    name: 'Garmin HRM-Pro Plus',
    brand: 'Garmin',
    model: 'HRM-PRO-55',
    type: 'heart_rate',
    serial_number: 'SN-GRM-9021',
    battery_level: 82,
    is_coach_owned: true,
    status: 'assigned',
    last_sync_at: new Date(Date.now() - 3600000).toISOString(),
    rssi: -65,
  },
  {
    id: 'dev-stryd-pod',
    name: 'Stryd Next-Gen Wind',
    brand: 'Stryd',
    model: 'Footpod v4',
    type: 'pod',
    serial_number: 'SN-STR-1049',
    battery_level: 100,
    is_coach_owned: true,
    status: 'idle',
    last_sync_at: new Date(Date.now() - 7200000).toISOString(),
    rssi: -58,
  },
];

export const BLE_DISCOVERABLE_DEVICES: MobileDevice[] = [
  {
    id: 'ble-coros-hr',
    name: 'COROS Heart Rate Monitor',
    brand: 'Coros',
    model: 'HR-ARM-2',
    type: 'heart_rate',
    serial_number: 'SN-CRS-3381',
    battery_level: 88,
    is_coach_owned: false,
    status: 'idle',
    rssi: -59,
  },
  {
    id: 'ble-wahoo-tickr',
    name: 'Wahoo TICKR X Dual',
    brand: 'Wahoo',
    model: 'TICKR-X-BT',
    type: 'heart_rate',
    serial_number: 'SN-WAH-7712',
    battery_level: 65,
    is_coach_owned: false,
    status: 'idle',
    rssi: -72,
  },
  {
    id: 'ble-garmin-965',
    name: 'Garmin Forerunner 965 BLE',
    brand: 'Garmin',
    model: 'FR-965',
    type: 'watch',
    serial_number: 'SN-GRM-9650',
    battery_level: 76,
    is_coach_owned: false,
    status: 'idle',
    rssi: -48,
  },
];

export async function fetchDevicesFromSupabase(): Promise<MobileDevice[]> {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return INITIAL_DEVICES;
    }

    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      brand: d.brand,
      model: d.model,
      type: d.type || 'heart_rate',
      serial_number: d.serial_number,
      battery_level: d.battery_level ?? 90,
      is_coach_owned: d.is_coach_owned ?? false,
      is_assigned: d.is_assigned ?? false,
      status: d.device_status || (d.is_assigned ? 'assigned' : 'idle'),
      last_sync_at: d.last_sync_at || d.created_at,
    }));
  } catch (err) {
    console.warn('[mobile deviceService] Fallback to local devices:', err);
    return INITIAL_DEVICES;
  }
}

export async function syncDeviceToSupabase(
  device: MobileDevice,
  ownerId?: string
): Promise<boolean> {
  try {
    const payload = {
      name: device.name,
      brand: device.brand,
      model: device.model,
      type: device.type,
      serial_number: device.serial_number || `SN-${Date.now().toString().slice(-6)}`,
      battery_level: device.battery_level,
      is_coach_owned: device.is_coach_owned,
      device_status: device.status,
      last_sync_at: new Date().toISOString(),
    };

    if (ownerId) {
      (payload as any).owner_id = ownerId;
    }

    const { error } = await supabase.from('devices').upsert(payload, { onConflict: 'serial_number' });
    if (error) {
      console.warn('[mobile deviceService] upsert device error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[mobile deviceService] syncDeviceToSupabase error:', err);
    return false;
  }
}
