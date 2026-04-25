# @catalyst/gaze-engine

Standalone TypeScript library: webcam gaze → **tile selected** events.

No UI, no React, no agents. Import it, register rectangles, get callbacks.

---

## Install

```bash
npm install @catalyst/gaze-engine
# WebGazer is an optional peer dep (only needed in browser, not for tests/harness)
npm install webgazer
```

---

## Quick start (browser)

Include WebGazer before your bundle (or import it):

```html
<script src="https://webgazer.cs.brown.edu/webgazer.js"></script>
```

```ts
import { GazeEngine } from '@catalyst/gaze-engine';

const engine = new GazeEngine({ dwellMs: 1200 });

// Register tiles from your AAC board
for (const tile of aacBoard.tiles) {
  const rect = tile.element.getBoundingClientRect();
  engine.registerTarget({ id: tile.id, rect, label: tile.label });
}

// Subscribe — returns unsubscribe fn
const unsub = engine.onSelect((tileId, target) => {
  console.log(`User selected: ${target.label}`);
  postToAgentGateway(tileId);
});

// Optional: render a dwell progress ring
engine.onDwellProgress((tileId, progress) => {
  renderProgressRing(tileId, progress); // 0.0 → 1.0
});

await engine.start(); // requests webcam, begins tracking
```

---

## Calibration

```ts
import { GazeEngine, generateCalibrationGrid, buildCalibrationProfile } from '@catalyst/gaze-engine';
import type { CalibrationSample } from '@catalyst/gaze-engine';

const engine = new GazeEngine();
const grid = generateCalibrationGrid(window.innerWidth, window.innerHeight, 3); // 9 points

const samples: CalibrationSample[] = [];

for (const point of grid) {
  showDot(point.x, point.y);       // show dot on screen
  await waitForUserGaze(800);       // let gaze settle
  const raw = await captureRawGaze(); // your UI calls engine.onGaze(...)
  samples.push({ screenX: point.x, screenY: point.y, rawGazeX: raw.x, rawGazeY: raw.y });
}

const profile = buildCalibrationProfile(samples);
engine.loadCalibrationProfile(profile);
localStorage.setItem('gazeCalibration', JSON.stringify(profile));
```

---

## Testing without a webcam

```ts
import { GazeEngine, MockGazeSource } from '@catalyst/gaze-engine';

const stream = JSON.parse(fs.readFileSync('tests/fixtures/mock-gaze-stream.json', 'utf-8'));
const source = new MockGazeSource(stream, 100 /* ms per frame */);
const engine = new GazeEngine({ dwellMs: 1200 }, source);
```

---

## API

### `new GazeEngine(config?, source?)`

| Option | Default | Description |
|--------|---------|-------------|
| `dwellMs` | `1200` | ms gaze must stay on tile before firing |
| `confidenceThreshold` | `0.3` | frames below this confidence are dropped |
| `filterAlpha` | `0.4` | EMA weight; higher = faster but jitterier |
| `calibrationGridSize` | `3` | side of calibration grid (3 → 3×3=9 points) |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `registerTarget(target)` | `void` | Add a tile to track |
| `unregisterTarget(id)` | `void` | Remove a tile |
| `clearTargets()` | `void` | Remove all tiles |
| `onSelect(cb)` | `() => void` | Selection callback; returns unsubscribe |
| `onDwellProgress(cb)` | `() => void` | Progress 0→1 while dwelling |
| `onGaze(cb)` | `() => void` | Filtered gaze position (debug) |
| `loadCalibrationProfile(p)` | `void` | Apply calibration |
| `clearCalibration()` | `void` | Remove calibration |
| `start()` | `Promise<void>` | Start tracking |
| `stop()` | `void` | Stop tracking |

---

## Run tests

```bash
npm install
npm test
```

## Run the node harness (no webcam needed)

```bash
npm run harness
```

Expected output:
```
Loaded 38 gaze frames spanning 3600ms

Starting engine…

  dwelling on WATER    [████████████████████] 100%
✓ SELECTED  Water  (tile id: WATER)
  dwelling on FOOD     [████████████████████] 100%
✓ SELECTED  Food  (tile id: FOOD)

[harness] stream complete
Done.
```
