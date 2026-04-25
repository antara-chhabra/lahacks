import { describe, it, expect, vi } from 'vitest';
import { DwellDetector } from '../src/dwell';
import type { Target } from '../src/types';

const WATER: Target = { id: 'WATER', rect: { x: 100, y: 100, width: 150, height: 150 } };
const FOOD: Target  = { id: 'FOOD',  rect: { x: 300, y: 100, width: 150, height: 150 } };

const pt = (x: number, y: number, t: number) => ({ x, y, confidence: 0.9, timestamp: t });

describe('DwellDetector', () => {
  it('fires after dwell threshold is met', () => {
    const onSelect = vi.fn();
    const d = new DwellDetector(1200, onSelect);
    d.registerTarget(WATER);

    d.process(pt(175, 175, 1000));   // enter WATER, dwellStart = 1000
    d.process(pt(175, 175, 2000));   // elapsed 1000ms — not yet
    d.process(pt(175, 175, 2200));   // elapsed 1200ms — fires

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('WATER', WATER);
  });

  it('does not fire before threshold', () => {
    const onSelect = vi.fn();
    const d = new DwellDetector(1200, onSelect);
    d.registerTarget(WATER);

    d.process(pt(175, 175, 0));
    d.process(pt(175, 175, 1100)); // 1100ms elapsed — not yet

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('resets when gaze leaves the target', () => {
    const onSelect = vi.fn();
    const d = new DwellDetector(1200, onSelect);
    d.registerTarget(WATER);

    d.process(pt(175, 175, 0));    // enter WATER
    d.process(pt(175, 175, 800)); // 800ms in — no fire
    d.process(pt(50,  50,  900)); // leave WATER — timer resets
    d.process(pt(175, 175, 1000)); // re-enter, new dwellStart = 1000
    d.process(pt(175, 175, 2100)); // 1100ms since re-entry — no fire
    d.process(pt(175, 175, 2200)); // 1200ms since re-entry — fires

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('fires on the correct target when multiple targets are registered', () => {
    const onSelect = vi.fn();
    const d = new DwellDetector(1200, onSelect);
    d.registerTarget(WATER);
    d.registerTarget(FOOD);

    // dwell on FOOD only
    d.process(pt(375, 175, 0));
    d.process(pt(375, 175, 1200));

    expect(onSelect).toHaveBeenCalledWith('FOOD', FOOD);
  });

  it('does not re-fire while gaze stays on the target after selection', () => {
    const onSelect = vi.fn();
    const d = new DwellDetector(1200, onSelect);
    d.registerTarget(WATER);

    d.process(pt(175, 175, 0));
    d.process(pt(175, 175, 1200)); // fires
    d.process(pt(175, 175, 1500)); // still on target — should NOT re-fire
    d.process(pt(175, 175, 2000)); // still on target — should NOT re-fire

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('re-fires after gaze leaves and re-enters the target', () => {
    const onSelect = vi.fn();
    const d = new DwellDetector(1200, onSelect);
    d.registerTarget(WATER);

    d.process(pt(175, 175, 0));
    d.process(pt(175, 175, 1200)); // first selection

    d.process(pt(50, 50, 1300));   // leave
    d.process(pt(175, 175, 1400)); // re-enter
    d.process(pt(175, 175, 2600)); // second selection (1200ms after re-entry)

    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('returns progress 0 when gaze is off all targets', () => {
    const d = new DwellDetector(1200, vi.fn());
    d.registerTarget(WATER);

    const result = d.process(pt(50, 50, 0));
    expect(result).toEqual({ targetId: null, dwellProgress: 0 });
  });

  it('returns progress between 0 and 1 while dwelling', () => {
    const d = new DwellDetector(1200, vi.fn());
    d.registerTarget(WATER);

    d.process(pt(175, 175, 0));           // enter
    const { dwellProgress } = d.process(pt(175, 175, 600)); // 50%

    expect(dwellProgress).toBeCloseTo(0.5, 5);
  });

  it('clamps progress to 1 after threshold', () => {
    const d = new DwellDetector(1200, vi.fn());
    d.registerTarget(WATER);

    d.process(pt(175, 175, 0));
    const { dwellProgress } = d.process(pt(175, 175, 2400)); // 200%

    expect(dwellProgress).toBe(1);
  });

  it('does nothing after clearTargets', () => {
    const onSelect = vi.fn();
    const d = new DwellDetector(1200, onSelect);
    d.registerTarget(WATER);
    d.clearTargets();

    d.process(pt(175, 175, 0));
    d.process(pt(175, 175, 1500));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('replays mock gaze stream and selects WATER then FOOD', () => {
    const selected: string[] = [];
    const d = new DwellDetector(1200, (id) => selected.push(id));
    d.registerTarget(WATER);
    d.registerTarget(FOOD);

    // Load fixture inline (avoid fs in tests — keep pure)
    // Stream: outside(0-400) → WATER(500-2000) → FOOD(2200-3600)
    // WATER fires at t=1700 (elapsed 1200ms from entry at 500)
    // FOOD  fires at t=3400 (elapsed 1200ms from entry at 2200)
    const stream = [
      pt(50,  50,  0),   pt(55, 45, 100),  pt(48, 55, 200),  pt(52, 50, 300),  pt(50, 51, 400),
      pt(175, 175, 500), pt(175, 175, 600), pt(175, 175, 700), pt(175, 175, 800),
      pt(175, 175, 900), pt(175, 175, 1000),pt(175, 175, 1100),pt(175, 175, 1200),
      pt(175, 175, 1300),pt(175, 175, 1400),pt(175, 175, 1500),pt(175, 175, 1600),
      pt(175, 175, 1700), // WATER fires here
      pt(175, 175, 1800),pt(175, 175, 1900),pt(175, 175, 2000),
      pt(255, 175, 2100), pt(295, 175, 2150), // transition (outside both)
      pt(375, 175, 2200), pt(375, 175, 2300), pt(375, 175, 2400), pt(375, 175, 2500),
      pt(375, 175, 2600), pt(375, 175, 2700), pt(375, 175, 2800), pt(375, 175, 2900),
      pt(375, 175, 3000), pt(375, 175, 3100), pt(375, 175, 3200), pt(375, 175, 3300),
      pt(375, 175, 3400), // FOOD fires here
      pt(375, 175, 3500), pt(375, 175, 3600),
    ];

    for (const p of stream) d.process(p);

    expect(selected).toEqual(['WATER', 'FOOD']);
  });
});
