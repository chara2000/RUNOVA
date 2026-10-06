/**
 * useBluetooth — Web Bluetooth API hook for RUNOVA
 *
 * Supports any BLE device that exposes standard GATT services:
 *   • Heart Rate Service        (0x180D) — HR measurement
 *   • Battery Service           (0x180F) — battery level %
 *   • Device Information        (0x180A) — model, manufacturer
 *   • Running Speed & Cadence   (0x1814) — RSC measurement
 *
 * Works in Chromium-based browsers (Chrome, Edge, Opera) and on
 * HTTPS origins or localhost only (Web Bluetooth security requirement).
 */

'use client';

import { useState, useCallback, useRef } from 'react';

// ─── GATT UUIDs ───────────────────────────────────────────────────────────────

const GATT = {
  services: {
    heartRate:           0x180d,
    battery:             0x180f,
    deviceInfo:          0x180a,
    runningSpeedCadence: 0x1814,
    cyclingSpeedCadence: 0x1816,
    fitnessMachine:      0x1826,
    userData:            0x181c,
  },
  characteristics: {
    heartRateMeasurement:    0x2a37,
    batteryLevel:            0x2a19,
    modelNumberString:       0x2a24,
    manufacturerNameString:  0x2a29,
    firmwareRevisionString:  0x2a26,
    rscMeasurement:          0x2a53,
  },
} as const;

// ─── Web Bluetooth API Ambient Types ──────────────────────────────────────────
export interface BluetoothRemoteGATTCharacteristic {
  value?: DataView;
  readValue: () => Promise<DataView>;
  startNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener: (type: string, listener: (this: BluetoothRemoteGATTCharacteristic, ev: Event) => any) => void;
  removeEventListener: (type: string, listener: (this: BluetoothRemoteGATTCharacteristic, ev: Event) => any) => void;
}

export interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristic: (characteristic: number | string) => Promise<BluetoothRemoteGATTCharacteristic>;
}

export interface BluetoothRemoteGATTServer {
  connected: boolean;
  device: BluetoothDevice;
  connect: () => Promise<BluetoothRemoteGATTServer>;
  disconnect: () => void;
  getPrimaryService: (service: number | string) => Promise<BluetoothRemoteGATTService>;
  getPrimaryServices?: (service?: number | string) => Promise<BluetoothRemoteGATTService[]>;
}

export interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
}

export interface RequestDeviceOptions {
  filters?: Array<{
    name?: string;
    namePrefix?: string;
    services?: Array<number | string>;
  }>;
  optionalServices?: Array<number | string>;
  acceptAllDevices?: boolean;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  batteryLevel: number | null;
  heartRate: number | null;
  manufacturer: string | null;
  model: string | null;
  firmware: string | null;
  supportedServices: string[];
  rawDevice: BluetoothDevice;
  server: BluetoothRemoteGATTServer | null;
}

export type BluetoothStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reading'
  | 'error'
  | 'unsupported'
  | 'disconnected';

export interface UseBluetoothReturn {
  status: BluetoothStatus;
  error: string | null;
  device: BluetoothDeviceInfo | null;
  isSupported: boolean;
  scan: () => Promise<void>;
  disconnect: () => void;
  readHeartRate: () => Promise<number | null>;
  readBattery: () => Promise<number | null>;
  subscribeHeartRate: (cb: (bpm: number) => void) => Promise<() => void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseHeartRate(view: DataView): number {
  const flags = view.getUint8(0);
  const is16bit = flags & 0x01;
  return is16bit ? view.getUint16(1, true) : view.getUint8(1);
}

async function tryGetService(
  server: BluetoothRemoteGATTServer,
  uuid: number
): Promise<BluetoothRemoteGATTService | null> {
  try {
    return await server.getPrimaryService(uuid);
  } catch {
    return null;
  }
}

async function tryReadCharacteristic(
  service: BluetoothRemoteGATTService | null,
  uuid: number
): Promise<DataView | null> {
  if (!service) return null;
  try {
    const char = await service.getCharacteristic(uuid);
    return await char.readValue();
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBluetooth(): UseBluetoothReturn {
  const isSupported =
    typeof navigator !== 'undefined' &&
    'bluetooth' in navigator &&
    typeof (navigator as Navigator & { bluetooth?: { requestDevice?: unknown } }).bluetooth?.requestDevice === 'function';

  const [status, setStatus] = useState<BluetoothStatus>(
    isSupported ? 'idle' : 'unsupported'
  );
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<BluetoothDeviceInfo | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const hrCharRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  // ── Disconnect ──────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (serverRef.current?.connected) {
      serverRef.current.disconnect();
    }
    serverRef.current = null;
    hrCharRef.current = null;
    setDevice(null);
    setStatus('disconnected');
    setError(null);
  }, []);

  // ── Scan & Connect ──────────────────────────────────────────────────────────
  const scan = useCallback(async () => {
    if (!isSupported) {
      setStatus('unsupported');
      setError('Web Bluetooth no está disponible en este navegador. Usa Chrome / Edge en HTTPS.');
      return;
    }

    setError(null);
    setStatus('scanning');

    let rawDevice: BluetoothDevice;

    try {
      rawDevice = await (navigator as Navigator & {
        bluetooth: {
          requestDevice: (opts: RequestDeviceOptions) => Promise<BluetoothDevice>;
        };
      }).bluetooth.requestDevice({
        // acceptAllDevices: true → muestra CUALQUIER dispositivo BLE cercano
        acceptAllDevices: true,
        optionalServices: [
          GATT.services.heartRate,
          GATT.services.battery,
          GATT.services.deviceInfo,
          GATT.services.runningSpeedCadence,
          GATT.services.cyclingSpeedCadence,
          GATT.services.fitnessMachine,
          GATT.services.userData,
        ],
      });
    } catch (err: unknown) {
      // El usuario canceló el selector — no es un error real
      if (err instanceof Error && err.name === 'NotFoundError') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Error desconocido al abrir el selector de dispositivos'
      );
      return;
    }

    setStatus('connecting');

    try {
      const server = await rawDevice.gatt!.connect();
      serverRef.current = server;

      setStatus('reading');

      // ── Read Device Info ──────────────────────────────────────────────────
      const infoService = await tryGetService(server, GATT.services.deviceInfo);
      const manufacturerData = await tryReadCharacteristic(
        infoService, GATT.characteristics.manufacturerNameString
      );
      const modelData = await tryReadCharacteristic(
        infoService, GATT.characteristics.modelNumberString
      );
      const firmwareData = await tryReadCharacteristic(
        infoService, GATT.characteristics.firmwareRevisionString
      );
      const decoder = new TextDecoder();
      const manufacturer = manufacturerData ? decoder.decode(manufacturerData) : null;
      const model        = modelData        ? decoder.decode(modelData)        : null;
      const firmware     = firmwareData     ? decoder.decode(firmwareData)     : null;

      // ── Read Battery ──────────────────────────────────────────────────────
      const batteryService = await tryGetService(server, GATT.services.battery);
      const batteryData    = await tryReadCharacteristic(
        batteryService, GATT.characteristics.batteryLevel
      );
      const batteryLevel = batteryData ? batteryData.getUint8(0) : null;

      // ── Read Heart Rate (one-shot) ────────────────────────────────────────
      const hrService = await tryGetService(server, GATT.services.heartRate);
      let heartRate: number | null = null;
      if (hrService) {
        try {
          const hrChar = await hrService.getCharacteristic(
            GATT.characteristics.heartRateMeasurement
          );
          hrCharRef.current = hrChar;
          const hrData = await hrChar.readValue();
          heartRate = parseHeartRate(hrData);
        } catch {
          heartRate = null;
        }
      }

      // ── Detect supported services ─────────────────────────────────────────
      const supportedServices: string[] = [];
      if (hrService)      supportedServices.push('Heart Rate');
      if (batteryService) supportedServices.push('Battery');
      if (infoService)    supportedServices.push('Device Info');
      const rscService = await tryGetService(server, GATT.services.runningSpeedCadence);
      if (rscService) supportedServices.push('Running Speed & Cadence');
      const cscService = await tryGetService(server, GATT.services.cyclingSpeedCadence);
      if (cscService) supportedServices.push('Cycling Speed & Cadence');

      // ── Listen for disconnect ─────────────────────────────────────────────
      rawDevice.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        setDevice((prev) => (prev ? { ...prev, server: null } : null));
      });

      const info: BluetoothDeviceInfo = {
        id: rawDevice.id,
        name: rawDevice.name || 'Dispositivo BLE',
        batteryLevel,
        heartRate,
        manufacturer,
        model,
        firmware,
        supportedServices,
        rawDevice,
        server,
      };

      setDevice(info);
      setStatus('connected');
    } catch (err: unknown) {
      setStatus('error');
      setError(
        err instanceof Error
          ? `Error de conexión: ${err.message}`
          : 'No se pudo conectar al dispositivo'
      );
    }
  }, [isSupported]);

  // ── Read Heart Rate on demand ───────────────────────────────────────────────
  const readHeartRate = useCallback(async (): Promise<number | null> => {
    if (!serverRef.current?.connected) return null;
    try {
      const hrService = await serverRef.current.getPrimaryService(GATT.services.heartRate);
      const char      = await hrService.getCharacteristic(GATT.characteristics.heartRateMeasurement);
      const data      = await char.readValue();
      const bpm       = parseHeartRate(data);
      setDevice((prev) => (prev ? { ...prev, heartRate: bpm } : prev));
      return bpm;
    } catch {
      return null;
    }
  }, []);

  // ── Read Battery on demand ──────────────────────────────────────────────────
  const readBattery = useCallback(async (): Promise<number | null> => {
    if (!serverRef.current?.connected) return null;
    try {
      const batService = await serverRef.current.getPrimaryService(GATT.services.battery);
      const char       = await batService.getCharacteristic(GATT.characteristics.batteryLevel);
      const data       = await char.readValue();
      const level      = data.getUint8(0);
      setDevice((prev) => (prev ? { ...prev, batteryLevel: level } : prev));
      return level;
    } catch {
      return null;
    }
  }, []);

  // ── Subscribe to HR notifications ──────────────────────────────────────────
  const subscribeHeartRate = useCallback(
    async (cb: (bpm: number) => void): Promise<() => void> => {
      if (!serverRef.current?.connected) return () => {};
      try {
        const hrService = await serverRef.current.getPrimaryService(GATT.services.heartRate);
        const char      = await hrService.getCharacteristic(GATT.characteristics.heartRateMeasurement);
        hrCharRef.current = char;

        const handler = (evt: Event) => {
          const view = (evt.target as unknown as BluetoothRemoteGATTCharacteristic)?.value;
          if (view) {
            const bpm = parseHeartRate(view);
            cb(bpm);
            setDevice((prev) => (prev ? { ...prev, heartRate: bpm } : prev));
          }
        };

        await char.startNotifications();
        char.addEventListener('characteristicvaluechanged', handler);

        return () => {
          char.removeEventListener('characteristicvaluechanged', handler);
          char.stopNotifications().catch(() => {});
        };
      } catch {
        return () => {};
      }
    },
    []
  );

  return {
    status,
    error,
    device,
    isSupported,
    scan,
    disconnect,
    readHeartRate,
    readBattery,
    subscribeHeartRate,
  };
}
