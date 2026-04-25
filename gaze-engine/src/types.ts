export interface GazePoint {
  x: number;          // pixels from left edge
  y: number;          // pixels from top edge
  confidence: number; // 0.0–1.0 (WebGazer uses fixed value; MediaPipe gives real values)
  timestamp: number;  // Unix ms
}

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Target {
  id: string;
  rect: TargetRect;
  label?: string;
}

export interface CalibrationSample {
  screenX: number;
  screenY: number;
  rawGazeX: number;
  rawGazeY: number;
}

export interface CalibrationProfile {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  sampleCount: number;
  createdAt: number; // Unix ms
}

export interface EngineConfig {
  dwellMs?: number;             // ms held on target before firing (default 1200)
  confidenceThreshold?: number; // drop gaze frames below this (default 0.3)
  filterAlpha?: number;         // EMA weight 0–1; higher = less smoothing (default 0.4)
  calibrationGridSize?: number; // side of calibration grid, so 3 → 3×3=9 points (default 3)
}

export type SelectionCallback = (targetId: string, target: Target) => void;
export type GazeCallback = (point: GazePoint) => void;
export type DwellProgressCallback = (targetId: string, progress: number) => void;
