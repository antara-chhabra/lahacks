/**
 * Node harness — replays the mock gaze stream and prints which tiles were selected.
 * Run with:  npm run harness
 *
 * This validates the full pipeline (filter → dwell) without a webcam.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GazeEngine, MockGazeSource } from '../src/index.js';
import type { GazePoint } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../tests/fixtures/mock-gaze-stream.json');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawStream = JSON.parse(readFileSync(fixture, 'utf-8')) as any[];
// Strip the comment entry that JSON doesn't technically support (we put _comment there)
const stream = rawStream.filter(p => typeof p.x === 'number') as GazePoint[];

console.log(`Loaded ${stream.length} gaze frames spanning ${stream.at(-1)!.timestamp}ms\n`);

// ── Tiles (matches the positions described in the fixture) ───────────────────

const tiles = [
  { id: 'WATER', label: 'Water',    rect: { x: 100, y: 100, width: 150, height: 150 } },
  { id: 'FOOD',  label: 'Food',     rect: { x: 300, y: 100, width: 150, height: 150 } },
];

// ── Engine setup ─────────────────────────────────────────────────────────────

let done: () => void;
const finished = new Promise<void>(res => { done = res; });

const source = new MockGazeSource(
  stream,
  100,   // replay at 100ms between frames (matching fixture spacing)
  () => {
    console.log('\n[harness] stream complete');
    done();
  },
);

const engine = new GazeEngine(
  { dwellMs: 1200, confidenceThreshold: 0.3, filterAlpha: 0.4 },
  source,
);

for (const tile of tiles) engine.registerTarget(tile);

engine.onSelect((id, target) => {
  console.log(`✓ SELECTED  ${target.label ?? id}  (tile id: ${id})`);
});

engine.onDwellProgress((id, progress) => {
  const bar = '█'.repeat(Math.round(progress * 20)).padEnd(20, '░');
  process.stdout.write(`\r  dwelling on ${id.padEnd(8)} [${bar}] ${Math.round(progress * 100)}%  `);
});

// ── Run ──────────────────────────────────────────────────────────────────────

console.log('Starting engine…\n');
await engine.start();
await finished;
engine.stop();
console.log('\nDone.');
