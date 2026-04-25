import { describe, it, expect } from 'vitest';
import { GazeFilter } from '../src/filter';

const pt = (x: number, y: number, conf = 0.9, ts = 0) => ({ x, y, confidence: conf, timestamp: ts });

describe('GazeFilter', () => {
  it('drops frames below confidence threshold', () => {
    const f = new GazeFilter(0.5, 0.5);
    expect(f.process(pt(100, 100, 0.49))).toBeNull();
  });

  it('passes frames at or above threshold', () => {
    const f = new GazeFilter(0.5, 0.5);
    expect(f.process(pt(100, 100, 0.5))).not.toBeNull();
    expect(f.process(pt(100, 100, 1.0))).not.toBeNull();
  });

  it('passes first valid frame through unchanged', () => {
    const f = new GazeFilter(0.4, 0.3);
    const result = f.process(pt(200, 300));
    expect(result?.x).toBe(200);
    expect(result?.y).toBe(300);
  });

  it('applies EMA: output moves toward input at rate alpha', () => {
    const f = new GazeFilter(0.4, 0.0); // threshold 0 so all frames pass
    f.process(pt(100, 100)); // first frame sets prevX/prevY to 100

    // second frame: EMA = 0.4*200 + 0.6*100 = 80+60 = 140
    const result = f.process(pt(200, 200));
    expect(result?.x).toBeCloseTo(140, 10);
    expect(result?.y).toBeCloseTo(140, 10);
  });

  it('converges to constant input over many frames', () => {
    const f = new GazeFilter(0.5, 0.0);
    let last = f.process(pt(0, 0))!;
    for (let i = 0; i < 30; i++) {
      last = f.process(pt(100, 100))!;
    }
    // After 30 frames the EMA should be very close to 100
    expect(last.x).toBeGreaterThan(99.9);
    expect(last.y).toBeGreaterThan(99.9);
  });

  it('preserves timestamp and confidence from input', () => {
    const f = new GazeFilter(0.4, 0.0);
    f.process(pt(0, 0, 0.8, 1000)); // seed
    const result = f.process(pt(100, 100, 0.75, 2000))!;
    expect(result.confidence).toBe(0.75);
    expect(result.timestamp).toBe(2000);
  });

  it('reset clears state so next frame is passed through unchanged', () => {
    const f = new GazeFilter(0.4, 0.0);
    f.process(pt(500, 500)); // seed far away
    f.reset();

    const result = f.process(pt(10, 10))!;
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
  });

  it('drops low-confidence frames even after state is set', () => {
    const f = new GazeFilter(0.4, 0.5);
    f.process(pt(100, 100, 0.9)); // seed
    expect(f.process(pt(200, 200, 0.3))).toBeNull(); // below threshold
  });

  it('alpha=1 gives no smoothing (pass-through)', () => {
    const f = new GazeFilter(1.0, 0.0);
    f.process(pt(0, 0));
    const result = f.process(pt(999, 999))!;
    expect(result.x).toBeCloseTo(999, 10);
  });

  it('alpha=0 freezes output after first frame', () => {
    const f = new GazeFilter(0.0, 0.0);
    f.process(pt(50, 50)); // sets prevX/prevY = 50
    const result = f.process(pt(999, 999))!; // EMA = 0*999 + 1*50 = 50
    expect(result.x).toBeCloseTo(50, 10);
  });
});
