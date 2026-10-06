/**
 * RUNOVA CONNECT — Sensor Hub & Device Capability Layer
 * Hardware abstraction layer for smartwatch sensors
 */

import { DeviceSensorCapabilities, TelemetryFrame } from './types';
import { calculateHrZone, formatSecondsToPace } from './workoutEngine';

export interface RawSensorSample {
  latitude?: number;
  longitude?: number;
  speedMps?: number;
  altitudeMeters?: number;
  heartRate?: number;
  stepsPerMinute?: number;
  accuracyMeters?: number;
}

export class WatchSensorHub {
  private capabilities: DeviceSensorCapabilities;
  private currentFrame: TelemetryFrame;

  constructor(capabilities?: Partial<DeviceSensorCapabilities>) {
    this.capabilities = {
      hasGps: capabilities?.hasGps ?? true,
      hasHeartRateSensor: capabilities?.hasHeartRateSensor ?? true,
      hasBarometer: capabilities?.hasBarometer ?? true,
      hasCadenceSensor: capabilities?.hasCadenceSensor ?? true,
      hasHaptics: capabilities?.hasHaptics ?? true,
      hasOfflineStorage: capabilities?.hasOfflineStorage ?? true,
      supportsBackgroundTracking: capabilities?.supportsBackgroundTracking ?? true,
      batteryLevelPercent: capabilities?.batteryLevelPercent ?? 92,
      platform: capabilities?.platform ?? 'watchos',
      modelName: capabilities?.modelName ?? 'Apple Watch Ultra 2 (49mm Titanium)',
    };

    this.currentFrame = {
      timestampMs: Date.now(),
      elapsedSeconds: 0,
      distanceMeters: 0,
      currentPaceSecKm: 300,
      currentPaceFormatted: '05:00 /km',
      averagePaceSecKm: 300,
      averagePaceFormatted: '05:00 /km',
      heartRateBpm: 148,
      heartRateZone: 3,
      cadenceSpm: 172,
      elevationMeters: 38,
    };
  }

  public getCapabilities(): DeviceSensorCapabilities {
    return this.capabilities;
  }

  /**
   * Process raw GPS / Sensor samples into a normalized telemetry frame
   */
  public ingestSample(sample: RawSensorSample, elapsedSec: number, distanceAccumulatedM: number): TelemetryFrame {
    // 1. Calculate pace in sec/km from speed (m/s)
    let paceSecKm = 300;
    if (sample.speedMps && sample.speedMps > 0.5) {
      paceSecKm = Math.round(1000 / sample.speedMps);
    } else if (distanceAccumulatedM > 50 && elapsedSec > 10) {
      paceSecKm = Math.round(elapsedSec / (distanceAccumulatedM / 1000));
    }

    const avgPaceSecKm = distanceAccumulatedM > 10 ? Math.round(elapsedSec / (distanceAccumulatedM / 1000)) : paceSecKm;
    const hr = sample.heartRate ?? this.currentFrame.heartRateBpm;

    this.currentFrame = {
      timestampMs: Date.now(),
      elapsedSeconds: elapsedSec,
      distanceMeters: distanceAccumulatedM,
      currentPaceSecKm: paceSecKm,
      currentPaceFormatted: formatSecondsToPace(paceSecKm),
      averagePaceSecKm: avgPaceSecKm,
      averagePaceFormatted: formatSecondsToPace(avgPaceSecKm),
      heartRateBpm: hr,
      heartRateZone: calculateHrZone(hr),
      cadenceSpm: sample.stepsPerMinute ?? 174,
      elevationMeters: Math.round(sample.altitudeMeters ?? 42),
      latitude: sample.latitude,
      longitude: sample.longitude,
      accuracyMeters: sample.accuracyMeters,
    };

    return this.currentFrame;
  }

  public getLatestFrame(): TelemetryFrame {
    return this.currentFrame;
  }
}
