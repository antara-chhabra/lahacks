import type { GazePoint, Target, SelectionCallback } from './types.js';

export interface DwellResult {
  targetId: string | null;
  dwellProgress: number; // 0.0–1.0; useful for rendering a progress ring on the tile
}

export class DwellDetector {
  private readonly targets = new Map<string, Target>();
  private readonly dwellMs: number;
  private readonly onSelect: SelectionCallback;

  private currentTargetId: string | null = null;
  private dwellStart: number | null = null;
  // Prevents continuous re-firing while gaze stays on a target after selection.
  // Cleared again when gaze re-enters the target from outside.
  private readonly fired = new Set<string>();

  constructor(dwellMs: number, onSelect: SelectionCallback) {
    this.dwellMs = dwellMs;
    this.onSelect = onSelect;
  }

  registerTarget(target: Target): void {
    this.targets.set(target.id, target);
  }

  unregisterTarget(id: string): void {
    this.targets.delete(id);
    if (this.currentTargetId === id) {
      this.currentTargetId = null;
      this.dwellStart = null;
    }
    this.fired.delete(id);
  }

  clearTargets(): void {
    this.targets.clear();
    this.reset();
  }

  /**
   * Feed one filtered gaze point. Drive this with every frame from GazeFilter.
   * No timers — selection is triggered purely by the timestamps embedded in points.
   */
  process(point: GazePoint): DwellResult {
    const hit = this.hitTest(point.x, point.y);
    const hitId = hit?.id ?? null;

    if (hitId !== this.currentTargetId) {
      this.currentTargetId = hitId;
      this.dwellStart = hitId !== null ? point.timestamp : null;
      // Re-arm this target so it can fire again after re-entry
      if (hitId !== null) this.fired.delete(hitId);
    }

    if (hitId === null || this.dwellStart === null) {
      return { targetId: null, dwellProgress: 0 };
    }

    const elapsed = point.timestamp - this.dwellStart;
    const progress = Math.min(elapsed / this.dwellMs, 1);

    if (elapsed >= this.dwellMs && !this.fired.has(hitId)) {
      this.fired.add(hitId);
      this.onSelect(hitId, hit!);
    }

    return { targetId: hitId, dwellProgress: progress };
  }

  reset(): void {
    this.currentTargetId = null;
    this.dwellStart = null;
    this.fired.clear();
  }

  private hitTest(x: number, y: number): Target | null {
    for (const target of this.targets.values()) {
      const r = target.rect;
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        return target;
      }
    }
    return null;
  }
}
