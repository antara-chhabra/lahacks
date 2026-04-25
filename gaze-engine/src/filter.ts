import type { GazePoint } from './types.js';

export class GazeFilter {
  private readonly alpha: number;
  private readonly confidenceThreshold: number;
  private prevX: number | null = null;
  private prevY: number | null = null;

  constructor(alpha = 0.4, confidenceThreshold = 0.3) {
    this.alpha = alpha;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Apply EMA smoothing to one raw gaze frame.
   * Returns null if the frame is dropped (low confidence).
   */
  process(point: GazePoint): GazePoint | null {
    if (point.confidence < this.confidenceThreshold) return null;

    if (this.prevX === null || this.prevY === null) {
      this.prevX = point.x;
      this.prevY = point.y;
      return point;
    }

    const x = this.alpha * point.x + (1 - this.alpha) * this.prevX;
    const y = this.alpha * point.y + (1 - this.alpha) * this.prevY;
    this.prevX = x;
    this.prevY = y;

    return { ...point, x, y };
  }

  reset(): void {
    this.prevX = null;
    this.prevY = null;
  }
}
