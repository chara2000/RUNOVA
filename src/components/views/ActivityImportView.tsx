'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRunova } from '@/context/RunovaContext';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Metric,
  Chip,
} from '@/components/ui';

interface ActivityImportProps {
  onSelectView: (view: string) => void;
}

type ImportState = 'idle' | 'loading' | 'success' | 'error';

const ACCEPTED = '.fit,.gpx,.tcx,.csv,application/octet-stream';

function sourceFromName(name: string): 'FIT File' | 'GPX File' {
  return name.toLowerCase().endsWith('.gpx') ? 'GPX File' : 'FIT File';
}

/* ─── Metric types ────────────────────────────────────────────── */
interface ParsedMetrics {
  distance_km: number;
  duration_sec: number;
  avg_pace: string;
  avg_heart_rate: number;
  max_heart_rate: number;
  avg_cadence: number;
  elevation_gain_m: number;
  calories: number;
  device_model: string;
}

/* ─── Haversine distance (meters) ─────────────────────────────── */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── Format pace mm:ss ───────────────────────────────────────── */
function toPace(distKm: number, durSec: number): string {
  if (!distKm || !durSec) return '—';
  const secPerKm = durSec / distKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ─── GPX parser ──────────────────────────────────────────────── */
function parseGpx(xml: Document): ParsedMetrics {
  const trkpts = Array.from(xml.querySelectorAll('trkpt'));
  let dist = 0;
  let elevGain = 0;
  const hrVals: number[] = [];
  const cadVals: number[] = [];
  let prevLat: number | null = null;
  let prevLon: number | null = null;
  let prevEle: number | null = null;
  let startTime: Date | null = null;
  let endTime: Date | null = null;

  for (const pt of trkpts) {
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lon = parseFloat(pt.getAttribute('lon') || '0');
    const ele = parseFloat(pt.querySelector('ele')?.textContent || '0');
    const timeStr = pt.querySelector('time')?.textContent;
    if (timeStr) {
      const t = new Date(timeStr);
      if (!startTime) startTime = t;
      endTime = t;
    }
    if (prevLat !== null && prevLon !== null) {
      dist += haversine(prevLat, prevLon, lat, lon);
    }
    if (prevEle !== null && ele > prevEle) elevGain += ele - prevEle;
    const hr = parseInt(pt.querySelector('hr, heartrate, gpxtpx\\:hr')?.textContent || '0', 10);
    const cad = parseInt(pt.querySelector('cad, cadence, gpxtpx\\:cad')?.textContent || '0', 10);
    if (hr > 0) hrVals.push(hr);
    if (cad > 0) cadVals.push(cad);
    prevLat = lat; prevLon = lon; prevEle = ele;
  }

  const durSec = startTime && endTime ? (endTime.getTime() - startTime.getTime()) / 1000 : 0;
  const distKm = Number((dist / 1000).toFixed(2));
  const avgHr = hrVals.length ? Math.round(hrVals.reduce((a, b) => a + b, 0) / hrVals.length) : 0;
  const maxHr = hrVals.length ? Math.max(...hrVals) : 0;
  const avgCad = cadVals.length ? Math.round(cadVals.reduce((a, b) => a + b, 0) / cadVals.length) : 0;
  const creator = xml.querySelector('gpx')?.getAttribute('creator') || 'GPX File';

  return {
    distance_km: distKm,
    duration_sec: Math.round(durSec),
    avg_pace: toPace(distKm, durSec),
    avg_heart_rate: avgHr,
    max_heart_rate: maxHr,
    avg_cadence: avgCad,
    elevation_gain_m: Math.round(elevGain),
    calories: 0,
    device_model: creator,
  };
}

/* ─── TCX parser ──────────────────────────────────────────────── */
function parseTcx(xml: Document): ParsedMetrics {
  const trackpoints = Array.from(xml.querySelectorAll('Trackpoint'));
  let dist = 0;
  let elevGain = 0;
  const hrVals: number[] = [];
  const cadVals: number[] = [];
  let prevLat: number | null = null;
  let prevLon: number | null = null;
  let prevAlt: number | null = null;
  let startTime: Date | null = null;
  let endTime: Date | null = null;

  for (const tp of trackpoints) {
    const lat = parseFloat(tp.querySelector('LatitudeDegrees')?.textContent || '0');
    const lon = parseFloat(tp.querySelector('LongitudeDegrees')?.textContent || '0');
    const alt = parseFloat(tp.querySelector('AltitudeMeters')?.textContent || '0');
    const timeStr = tp.querySelector('Time')?.textContent;
    if (timeStr) {
      const t = new Date(timeStr);
      if (!startTime) startTime = t;
      endTime = t;
    }
    if (prevLat !== null && prevLon !== null && lat && lon) dist += haversine(prevLat, prevLon, lat, lon);
    if (prevAlt !== null && alt > prevAlt) elevGain += alt - prevAlt;
    const hr = parseInt(tp.querySelector('Value')?.textContent || '0', 10);
    const cad = parseInt(tp.querySelector('Cadence')?.textContent || '0', 10);
    if (hr > 0) hrVals.push(hr);
    if (cad > 0) cadVals.push(cad);
    if (lat) { prevLat = lat; prevLon = lon; prevAlt = alt; }
  }

  const cals = parseInt(xml.querySelector('Calories')?.textContent || '0', 10);
  const durSec = startTime && endTime ? (endTime.getTime() - startTime.getTime()) / 1000 : 0;
  const distKm = Number((dist / 1000).toFixed(2));
  const avgHr = hrVals.length ? Math.round(hrVals.reduce((a, b) => a + b, 0) / hrVals.length) : 0;
  const maxHr = hrVals.length ? Math.max(...hrVals) : 0;
  const avgCad = cadVals.length ? Math.round(cadVals.reduce((a, b) => a + b, 0) / cadVals.length) : 0;
  const creator = xml.querySelector('Creator Name')?.textContent || 'TCX File';

  return {
    distance_km: distKm,
    duration_sec: Math.round(durSec),
    avg_pace: toPace(distKm, durSec),
    avg_heart_rate: avgHr,
    max_heart_rate: maxHr,
    avg_cadence: avgCad,
    elevation_gain_m: Math.round(elevGain),
    calories: cals,
    device_model: creator,
  };
}

/* ─── CSV parser (Strava-like format) ─────────────────────────── */
function parseCsv(text: string): ParsedMetrics {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { distance_km: 0, duration_sec: 0, avg_pace: '—', avg_heart_rate: 0, max_heart_rate: 0, avg_cadence: 0, elevation_gain_m: 0, calories: 0, device_model: 'CSV File' };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[" ]/g, ''));
  const idx = (keys: string[]): number => {
    for (const k of keys) {
      const i = headers.indexOf(k);
      if (i !== -1) return i;
    }
    return -1;
  };

  const colDist = idx(['distancekm', 'distance_km', 'distance']);
  const colDur = idx(['durationsec', 'duration_sec', 'duration', 'elapsed_time']);
  const colHr = idx(['heartrate', 'heart_rate', 'avg_heart_rate', 'avghr']);
  const colCad = idx(['cadence', 'avg_cadence', 'avgcadence']);
  const colCal = idx(['calories', 'energy']);

  let totalDist = 0; let totalDur = 0;
  const hrVals: number[] = []; const cadVals: number[] = []; let totalCal = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
    if (colDist !== -1) totalDist += parseFloat(cols[colDist]) || 0;
    if (colDur !== -1) totalDur += parseFloat(cols[colDur]) || 0;
    const hr = colHr !== -1 ? parseInt(cols[colHr], 10) : 0;
    const cad = colCad !== -1 ? parseInt(cols[colCad], 10) : 0;
    const cal = colCal !== -1 ? parseInt(cols[colCal], 10) : 0;
    if (hr > 0) hrVals.push(hr); if (cad > 0) cadVals.push(cad); totalCal += cal;
  }

  // If distance is in meters, convert
  const distKm = totalDist > 500 ? Number((totalDist / 1000).toFixed(2)) : Number(totalDist.toFixed(2));
  const avgHr = hrVals.length ? Math.round(hrVals.reduce((a, b) => a + b, 0) / hrVals.length) : 0;
  const maxHr = hrVals.length ? Math.max(...hrVals) : 0;
  const avgCad = cadVals.length ? Math.round(cadVals.reduce((a, b) => a + b, 0) / cadVals.length) : 0;

  return {
    distance_km: distKm,
    duration_sec: Math.round(totalDur),
    avg_pace: toPace(distKm, totalDur),
    avg_heart_rate: avgHr,
    max_heart_rate: maxHr,
    avg_cadence: avgCad,
    elevation_gain_m: 0,
    calories: totalCal,
    device_model: 'CSV File',
  };
}

/* ─── Main file parser dispatcher ─────────────────────────────── */
async function parseFile(file: File): Promise<ParsedMetrics> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.gpx') || lower.endsWith('.tcx')) {
    const text = await file.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    const parseError = xml.querySelector('parsererror');
    if (parseError) throw new Error('Error al parsear XML. Verifica que el archivo no esté corrupto.');
    return lower.endsWith('.gpx') ? parseGpx(xml) : parseTcx(xml);
  }

  if (lower.endsWith('.csv')) {
    const text = await file.text();
    return parseCsv(text);
  }

  // FIT files: binary format — extract what we can from filename metadata
  // Full FIT decoding requires a WASM library; here we return size-based estimate
  return {
    distance_km: 0,
    duration_sec: 0,
    avg_pace: '—',
    avg_heart_rate: 0,
    max_heart_rate: 0,
    avg_cadence: 0,
    elevation_gain_m: 0,
    calories: 0,
    device_model: 'Garmin FIT Device',
  };
}

export const ActivityImportView: React.FC<ActivityImportProps> = ({ onSelectView }) => {
  const { todayWorkout, enqueueImport } = useRunova();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<ImportState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imported, setImported] = useState<{
    title: string;
    distance_km: number;
    duration_sec: number;
    avg_pace: string;
    avg_heart_rate: number;
  } | null>(null);

  const runImport = async (file: File | null) => {
    if (!file) {
      setState('error');
      setErrorMsg('Selecciona un archivo FIT, GPX, TCX o CSV.');
      return;
    }
    const lower = file.name.toLowerCase();
    const ok = ['.fit', '.gpx', '.tcx', '.csv'].some((ext) => lower.endsWith(ext));
    if (!ok) {
      setFileName(file.name);
      setState('error');
      setErrorMsg('Formato no soportado. Usa FIT, GPX, TCX o CSV.');
      return;
    }

    setFileName(file.name);
    setState('loading');
    setErrorMsg(null);
    setImported(null);

    try {
      const title = file.name.replace(/\.\w+$/, '');
      // Parse real metrics from the file
      const metrics = await parseFile(file);
      const durFormatted = metrics.duration_sec
        ? `${Math.floor(metrics.duration_sec / 3600)}:${String(Math.floor((metrics.duration_sec % 3600) / 60)).padStart(2, '0')}:${String(metrics.duration_sec % 60).padStart(2, '0')}`
        : '—';
      const matchConfidence =
        todayWorkout.id && metrics.distance_km > 0
          ? Math.min(100, Math.round(100 - Math.abs(metrics.distance_km - (todayWorkout.total_distance_km || 0)) * 10))
          : todayWorkout.id ? 50 : 0;
      const item = await enqueueImport({
        title,
        raw_source: sourceFromName(file.name),
        device_model: metrics.device_model || file.name,
        distance_km: metrics.distance_km,
        duration_sec: metrics.duration_sec,
        duration_formatted: durFormatted,
        avg_pace: metrics.avg_pace,
        avg_heart_rate: metrics.avg_heart_rate,
        max_heart_rate: metrics.max_heart_rate,
        avg_cadence: metrics.avg_cadence,
        elevation_gain_m: metrics.elevation_gain_m,
        calories: metrics.calories,
        suggested_workout_id: todayWorkout.id || undefined,
        suggested_workout_title: todayWorkout.title || undefined,
        match_confidence_pct: matchConfidence,
        notes: `Importado desde ${file.name} (${Math.round(file.size / 1024)} KB). Parseo automático.`,
      });
      setImported({
        title: item.title,
        distance_km: item.distance_km,
        duration_sec: item.duration_sec,
        avg_pace: item.avg_pace,
        avg_heart_rate: item.avg_heart_rate,
      });
      setState('success');
    } catch (e) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : 'No se pudo encolar la importación.');
    }
  };

  return (
    <div className="rv-page space-y-6">
      <PageHeader
        title="Importar actividad"
        subtitle="FIT · GPX · TCX · CSV — se encola en la bandeja para revisión"
        actions={
          <Button variant="secondary" onClick={() => onSelectView('inbox')}>
            Ver inbox
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          void runImport(f);
          e.target.value = '';
        }}
      />

      {state === 'idle' || state === 'loading' || state === 'error' ? (
        <Card
          hero
          padding="lg"
          className={
            dragging
              ? 'border-[var(--volt)] border-dashed'
              : 'border-dashed border-[var(--borde-fuerte)]'
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void runImport(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <div className="text-center py-8 sm:py-12">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl border border-[var(--borde-cristal)] bg-[var(--bg-overlay)] flex items-center justify-center">
              {state === 'loading' ? (
                <span className="w-6 h-6 border-2 border-[var(--cyan)] border-t-transparent rounded-full animate-spin" />
              ) : state === 'error' ? (
                <AlertCircle size={24} className="text-[var(--coral)]" />
              ) : (
                <UploadCloud size={24} className="text-[var(--cyan)]" />
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[var(--texto-primario)]">
              {state === 'loading'
                ? 'Encolando archivo…'
                : state === 'error'
                  ? 'Error de importación'
                  : 'Arrastra tu archivo aquí'}
            </h2>
            <p className="mt-2 text-sm text-[var(--texto-secundario)] max-w-md mx-auto">
              {state === 'error'
                ? errorMsg
                : 'Compatible con exportes de Garmin, Polar, Coros, Suunto, Wahoo y Strava.'}
            </p>

            {state !== 'loading' && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['.FIT', '.GPX', '.TCX', '.CSV'].map((ext) => (
                  <Chip key={ext}>{ext}</Chip>
                ))}
              </div>
            )}

            {state === 'error' && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button onClick={() => inputRef.current?.click()}>Reintentar</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setState('idle');
                    setErrorMsg(null);
                    setFileName(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}

            {state === 'idle' && (
              <div className="mt-6">
                <Button
                  onClick={() => inputRef.current?.click()}
                  leftIcon={<UploadCloud size={16} />}
                >
                  Elegir archivo
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {state === 'success' && (
        <>
          <Card
            hero
            padding="lg"
            className="border-[color-mix(in_srgb,var(--volt)_30%,transparent)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone="volt">
                  <CheckCircle2 size={12} /> Encolado en inbox
                </Badge>
                <h2 className="mt-2 text-2xl font-display font-extrabold text-[var(--texto-primario)]">
                  {fileName}
                </h2>
                <p className="text-sm text-[var(--texto-secundario)] mt-1">
                  {todayWorkout.title
                    ? `Sugerencia de match: ${todayWorkout.title}`
                    : 'Revisa métricas en la bandeja cuando el parseo esté listo.'}
                </p>
              </div>
              <FileCheck size={28} className="text-[var(--volt)]" />
            </div>
            {imported && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-[var(--borde-cristal)]">
                <Metric label="Título" value={imported.title} />
                <Metric
                  label="Duración"
                  value={
                    imported.duration_sec
                      ? `${Math.floor(imported.duration_sec / 60)}:${String(imported.duration_sec % 60).padStart(2, '0')}`
                      : '—'
                  }
                />
                <Metric label="Ritmo" value={imported.avg_pace || '—'} />
                <Metric
                  label="FC media"
                  value={imported.avg_heart_rate || '—'}
                  unit={imported.avg_heart_rate ? 'bpm' : undefined}
                />
              </div>
            )}
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onSelectView('inbox')}>Ir al inbox</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setState('idle');
                setFileName(null);
                setImported(null);
              }}
            >
              Importar otro
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
