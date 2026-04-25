import type { GazePoint, GazeCallback } from './types.js';

export interface GazeSource {
  start(callback: GazeCallback): Promise<void>;
  stop(): void;
}

/**
 * Wraps WebGazer (https://webgazer.cs.brown.edu/).
 * WebGazer must be loaded separately via <script> tag or npm import by the consuming app.
 * It exposes itself as window.webgazer / globalThis.webgazer.
 */
export class WebGazerSource implements GazeSource {
  // WebGazer doesn't expose a confidence value — we use a fixed reasonable estimate.
  private static readonly FIXED_CONFIDENCE = 0.7;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private wg: any = null;

  async start(callback: GazeCallback): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wg = (globalThis as any).webgazer;
    if (!wg) {
      throw new Error(
        'WebGazer not found on globalThis. ' +
          'Add <script src="webgazer.js"></script> before importing GazeEngine, ' +
          'or pass a custom GazeSource to the GazeEngine constructor.',
      );
    }

    this.wg = wg;

    await wg
      .setGazeListener(
        (data: { x: number; y: number } | null, elapsedTime: number) => {
          if (!data) return;
          callback({
            x: data.x,
            y: data.y,
            confidence: WebGazerSource.FIXED_CONFIDENCE,
            timestamp: Date.now(),
          });
          void elapsedTime; // WebGazer provides elapsed ms since page load, not Unix ms
        },
      )
      .begin();

    wg.showPredictionPoints(false);
    wg.showFaceOverlay(false);
    wg.showFaceFeedbackBox(false);
  }

  stop(): void {
    this.wg?.end();
    this.wg = null;
  }
}

/**
 * Replays a pre-recorded gaze stream.
 * Used for tests (via DwellDetector.process directly) and the node harness demo.
 */
export class MockGazeSource implements GazeSource {
  private readonly points: GazePoint[];
  private readonly frameIntervalMs: number;
  private readonly onComplete?: () => void;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(points: GazePoint[], frameIntervalMs = 33, onComplete?: () => void) {
    this.points = points;
    this.frameIntervalMs = frameIntervalMs;
    this.onComplete = onComplete;
  }

  async start(callback: GazeCallback): Promise<void> {
    let i = 0;
    const baseTime = Date.now() - (this.points[0]?.timestamp ?? 0);

    this.timer = setInterval(() => {
      if (i >= this.points.length) {
        this.stop();
        this.onComplete?.();
        return;
      }
      const pt = this.points[i++];
      // Re-anchor timestamps to now so the dwell detector sees real wall-clock deltas
      callback({ ...pt, timestamp: baseTime + pt.timestamp });
    }, this.frameIntervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
