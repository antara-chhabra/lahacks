import { describe, it, expect } from 'vitest';
import { buildCalibrationProfile, applyCalibration, generateCalibrationGrid } from '../src/calibration';

describe('buildCalibrationProfile', () => {
  it('returns identity transform when no samples are provided', () => {
    const p = buildCalibrationProfile([]);
    expect(p.scaleX).toBe(1);
    expect(p.scaleY).toBe(1);
    expect(p.offsetX).toBe(0);
    expect(p.offsetY).toBe(0);
    expect(p.sampleCount).toBe(0);
  });

  it('returns identity when only one sample is provided', () => {
    const p = buildCalibrationProfile([{ rawGazeX: 100, rawGazeY: 100, screenX: 200, screenY: 200 }]);
    expect(p.scaleX).toBe(1);
    expect(p.scaleY).toBe(1);
  });

  it('recovers a perfect linear relationship: screenX = 2*rawX + 10', () => {
    const samples = [
      { rawGazeX: 100, rawGazeY: 100, screenX: 210, screenY: 210 },
      { rawGazeX: 200, rawGazeY: 200, screenX: 410, screenY: 410 },
      { rawGazeX: 300, rawGazeY: 300, screenX: 610, screenY: 610 },
      { rawGazeX: 400, rawGazeY: 400, screenX: 810, screenY: 810 },
    ];
    const p = buildCalibrationProfile(samples);
    expect(p.scaleX).toBeCloseTo(2, 5);
    expect(p.offsetX).toBeCloseTo(10, 5);
    expect(p.scaleY).toBeCloseTo(2, 5);
    expect(p.offsetY).toBeCloseTo(10, 5);
  });

  it('recovers different X and Y transforms', () => {
    // screenX = 1.5*rawX + 50 | screenY = 0.8*rawY - 20
    const samples = [
      { rawGazeX: 100, rawGazeY: 100, screenX: 200,  screenY: 60  },
      { rawGazeX: 200, rawGazeY: 200, screenX: 350,  screenY: 140 },
      { rawGazeX: 300, rawGazeY: 300, screenX: 500,  screenY: 220 },
      { rawGazeX: 400, rawGazeY: 400, screenX: 650,  screenY: 300 },
    ];
    const p = buildCalibrationProfile(samples);
    expect(p.scaleX).toBeCloseTo(1.5, 5);
    expect(p.offsetX).toBeCloseTo(50, 5);
    expect(p.scaleY).toBeCloseTo(0.8, 5);
    expect(p.offsetY).toBeCloseTo(-20, 5);
  });

  it('records sample count and createdAt', () => {
    const before = Date.now();
    const p = buildCalibrationProfile([
      { rawGazeX: 0, rawGazeY: 0, screenX: 0, screenY: 0 },
      { rawGazeX: 1, rawGazeY: 1, screenX: 1, screenY: 1 },
    ]);
    const after = Date.now();
    expect(p.sampleCount).toBe(2);
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });
});

describe('applyCalibration', () => {
  it('transforms raw gaze using scale and offset', () => {
    const profile = { scaleX: 2, scaleY: 0.5, offsetX: 10, offsetY: -5, sampleCount: 4, createdAt: 0 };
    const result = applyCalibration(100, 200, profile);
    expect(result.x).toBeCloseTo(210, 10); // 2*100 + 10
    expect(result.y).toBeCloseTo(95, 10);  // 0.5*200 + (-5)
  });

  it('identity profile leaves coordinates unchanged', () => {
    const profile = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, sampleCount: 0, createdAt: 0 };
    const result = applyCalibration(320, 240, profile);
    expect(result.x).toBe(320);
    expect(result.y).toBe(240);
  });
});

describe('generateCalibrationGrid', () => {
  it('generates N² points for an N×N grid', () => {
    expect(generateCalibrationGrid(1280, 720, 3)).toHaveLength(9);
    expect(generateCalibrationGrid(1280, 720, 5)).toHaveLength(25);
    expect(generateCalibrationGrid(1280, 720, 1)).toHaveLength(1);
  });

  it('all points fall within the 10% margin', () => {
    const W = 1280, H = 720;
    const pts = generateCalibrationGrid(W, H, 3);
    for (const { x, y } of pts) {
      expect(x).toBeGreaterThanOrEqual(W * 0.1 - 1);
      expect(x).toBeLessThanOrEqual(W * 0.9 + 1);
      expect(y).toBeGreaterThanOrEqual(H * 0.1 - 1);
      expect(y).toBeLessThanOrEqual(H * 0.9 + 1);
    }
  });

  it('3×3 grid corners are symmetric', () => {
    const pts = generateCalibrationGrid(1000, 1000, 3);
    const topLeft     = pts[0];
    const topRight    = pts[2];
    const bottomLeft  = pts[6];
    const bottomRight = pts[8];
    expect(topLeft.x).toBe(bottomLeft.x);
    expect(topRight.x).toBe(bottomRight.x);
    expect(topLeft.y).toBe(topRight.y);
    expect(bottomLeft.y).toBe(bottomRight.y);
  });

  it('center point of 3×3 grid is at screen center', () => {
    const pts = generateCalibrationGrid(1000, 1000, 3);
    expect(pts[4].x).toBe(500); // center column
    expect(pts[4].y).toBe(500); // center row
  });
});
