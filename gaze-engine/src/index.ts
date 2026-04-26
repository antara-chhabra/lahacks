import type {
  Target,
  EngineConfig,
  CalibrationProfile,
  SelectionCallback,
  GazeCallback,
  DwellProgressCallback,
} from './types.js';
import { GazeFilter } from './filter.js';
import { DwellDetector } from './dwell.js';
import { applyCalibration } from './calibration.js';
import type { GazeSource } from './tracker.js';
import { WebGazerSource } from './tracker.js';

// Re-export everything consumers need
export type {
  GazePoint,
  Target,
  TargetRect,
  CalibrationProfile,
  CalibrationSample,
  EngineConfig,
  SelectionCallback,
  GazeCallback,
  DwellProgressCallback,
} from './types.js';
export type { GazeSource } from './tracker.js';
export { MockGazeSource, WebGazerSource } from './tracker.js';
export { buildCalibrationProfile, applyCalibration, generateCalibrationGrid } from './calibration.js';

/**
 * Compress horizontal gaze only in the centre of the screen.
 * The outer 20% on each side passes through untouched so SEND/UNDO remain reachable.
 * A sine bell blends smoothly between compressed centre and uncompressed edges.
 */
function applyZoneGain(x: number, gain: number): number {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const norm = x / w;                      // 0..1 across screen
  const edgeW = 0.20;                       // outer 20% each side = no compression
  if (norm <= edgeW || norm >= 1 - edgeW) return x;

  // t = 0 at edge boundaries, peaks at 1 in the exact centre
  const mid = (norm - edgeW) / (1 - 2 * edgeW); // 0..1 across centre zone
  const t = Math.sin(mid * Math.PI);             // sine bell

  const cx = w / 2;
  const compressed = cx + (x - cx) * gain;
  return x + (compressed - x) * t;
}

export class GazeEngine {
  private readonly cfg: Required<EngineConfig>;
  private readonly filter: GazeFilter;
  private readonly dwell: DwellDetector;
  private readonly source: GazeSource;

  private calibration: CalibrationProfile | null = null;
  private running = false;

  private readonly selectListeners: SelectionCallback[] = [];
  private readonly progressListeners: DwellProgressCallback[] = [];
  private readonly gazeListeners: GazeCallback[] = [];

  constructor(config: EngineConfig = {}, source?: GazeSource) {
    this.cfg = {
      dwellMs: config.dwellMs ?? 1200,
      confidenceThreshold: config.confidenceThreshold ?? 0.3,
      filterAlpha: config.filterAlpha ?? 0.4,
      calibrationGridSize: config.calibrationGridSize ?? 3,
      xGain: config.xGain ?? 1.0,
    };

    this.filter = new GazeFilter(this.cfg.filterAlpha, this.cfg.confidenceThreshold);
    this.dwell = new DwellDetector(this.cfg.dwellMs, (id, target) => {
      for (const fn of this.selectListeners) fn(id, target);
    });
    this.source = source ?? new WebGazerSource();
  }

  // ── Target management ───────────────────────────────────────────────────────

  registerTarget(target: Target): void {
    this.dwell.registerTarget(target);
  }

  unregisterTarget(id: string): void {
    this.dwell.unregisterTarget(id);
  }

  clearTargets(): void {
    this.dwell.clearTargets();
  }

  // ── Subscriptions (all return an unsubscribe function) ──────────────────────

  onSelect(callback: SelectionCallback): () => void {
    this.selectListeners.push(callback);
    return () => this.remove(this.selectListeners, callback);
  }

  /** Progress 0→1 while gaze dwells on a target. Useful for rendering a progress ring. */
  onDwellProgress(callback: DwellProgressCallback): () => void {
    this.progressListeners.push(callback);
    return () => this.remove(this.progressListeners, callback);
  }

  /** Raw filtered gaze position after calibration. Useful for debug overlays. */
  onGaze(callback: GazeCallback): () => void {
    this.gazeListeners.push(callback);
    return () => this.remove(this.gazeListeners, callback);
  }

  // ── Calibration ─────────────────────────────────────────────────────────────

  loadCalibrationProfile(profile: CalibrationProfile): void {
    this.calibration = profile;
  }

  clearCalibration(): void {
    this.calibration = null;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.filter.reset();
    this.dwell.reset();

    await this.source.start((raw) => {
      // 1. Apply calibration offset/scale if present
      let point = raw;
      if (this.calibration) {
        let { x, y } = applyCalibration(raw.x, raw.y, this.calibration);
        if (this.cfg.xGain !== 1.0) {
          x = applyZoneGain(x, this.cfg.xGain);
        }
        point = { ...raw, x, y };
      }

      // 2. Smooth and drop low-confidence frames
      const filtered = this.filter.process(point);
      if (!filtered) return;

      // 3. Notify raw gaze listeners
      for (const fn of this.gazeListeners) fn(filtered);

      // 4. Dwell detection
      const { targetId, dwellProgress } = this.dwell.process(filtered);
      if (targetId !== null) {
        for (const fn of this.progressListeners) fn(targetId, dwellProgress);
      }
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.source.stop();
    this.filter.reset();
    this.dwell.reset();
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private remove<T>(arr: T[], item: T): void {
    const idx = arr.indexOf(item);
    if (idx !== -1) arr.splice(idx, 1);
  }
}
