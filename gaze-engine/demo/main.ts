import { GazeEngine, buildCalibrationProfile } from '@catalyst/gaze-engine';
import type { GazeSource, GazeCallback, CalibrationSample, CalibrationProfile } from '@catalyst/gaze-engine';
import { MediaPipeGazeSource } from './mediapipe-source';

// ── Tile definitions ─────────────────────────────────────────────────────────

const TILES = [
  { id: 'WATER',     label: 'Water',     emoji: '💧', color: '#3b82f6', phrase: 'I would like some water, please.' },
  { id: 'FOOD',      label: 'Food',      emoji: '🍎', color: '#22c55e', phrase: 'I am hungry. Can I have something to eat?' },
  { id: 'BATHROOM',  label: 'Bathroom',  emoji: '🚿', color: '#f59e0b', phrase: 'I need to use the bathroom.' },
  { id: 'PAIN',      label: 'Pain',      emoji: '😣', color: '#ef4444', phrase: 'I am in pain. Please help me.' },
  { id: 'HELP',      label: 'Help',      emoji: '🚨', color: '#f97316', phrase: 'I need help, please.' },
  { id: 'CALL',      label: 'Call',      emoji: '📞', color: '#8b5cf6', phrase: 'Please call someone for me.' },
  { id: 'STOP',      label: 'Stop',      emoji: '✋', color: '#6366f1', phrase: 'Please stop.' },
  { id: 'HELLO',     label: 'Hello',     emoji: '👋', color: '#a855f7', phrase: 'Hello! How are you?' },
  { id: 'YES',       label: 'Yes',       emoji: '✅', color: '#10b981', phrase: 'Yes.' },
  { id: 'NO',        label: 'No',        emoji: '❌', color: '#f43f5e', phrase: 'No.' },
  { id: 'HAPPY',     label: 'Happy',     emoji: '😊', color: '#eab308', phrase: 'I am feeling happy today.' },
  { id: 'THANK_YOU', label: 'Thank You', emoji: '🙏', color: '#06b6d4', phrase: 'Thank you so much.' },
];

// ── Mouse gaze source ─────────────────────────────────────────────────────────

class MouseGazeSource implements GazeSource {
  private handler: ((e: MouseEvent) => void) | null = null;

  async start(callback: GazeCallback): Promise<void> {
    this.handler = (e: MouseEvent) => {
      callback({ x: e.clientX, y: e.clientY, confidence: 0.9, timestamp: Date.now() });
    };
    document.addEventListener('mousemove', this.handler);
  }

  stop(): void {
    if (this.handler) document.removeEventListener('mousemove', this.handler!);
    this.handler = null;
  }
}

// ── Screen helpers ────────────────────────────────────────────────────────────

function showScreen(id: string) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)!.classList.add('active');
}

// ── Calibration ───────────────────────────────────────────────────────────────

const CALIB_GRID = [
  { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
  { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
  { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 },
];
const CLICKS_PER_DOT = 3;

// Mouse-only calibration (no gaze data to capture)
function runMouseCalibration(): Promise<void> {
  return runCalibrationUI(null);
}

// Webcam calibration — captures iris position on each click
function runWebcamCalibration(source: MediaPipeGazeSource): Promise<CalibrationSample[]> {
  const samples: CalibrationSample[] = [];

  return new Promise(resolve => {
    runCalibrationUI(source, samples, resolve);
  });
}

function runCalibrationUI(
  source: MediaPipeGazeSource | null,
  samples?: CalibrationSample[],
  onDone?: (s: CalibrationSample[]) => void,
): Promise<void> {
  return new Promise(resolve => {
    const surface  = document.getElementById('calib-surface')!;
    const nEl      = document.getElementById('calib-n')!;
    const clicksEl = document.getElementById('calib-clicks')!;
    surface.innerHTML = '';

    const dots = CALIB_GRID.map((pos, i) => {
      const dot = document.createElement('div');
      dot.className = 'calib-dot';
      dot.style.left = `${pos.x * 100}vw`;
      dot.style.top  = `${pos.y * 100}vh`;
      if (i !== 0) dot.style.opacity = '0.3';
      surface.appendChild(dot);
      return dot;
    });

    let current = 0;
    let clicks  = 0;
    dots[0].classList.add('active');
    nEl.textContent     = '1';
    clicksEl.textContent = '0';

    const advance = () => {
      dots[current].classList.remove('active');
      dots[current].classList.add('done');
      current++;
      if (current >= CALIB_GRID.length) {
        surface.innerHTML = '';
        if (onDone && samples) onDone(samples);
        resolve();
        return;
      }
      clicks = 0;
      clicksEl.textContent = '0';
      nEl.textContent = String(current + 1);
      dots[current].style.opacity = '1';
      dots[current].classList.add('active');
    };

    const onClick = (i: number) => {
      if (i !== current) return;
      clicks++;
      clicksEl.textContent = String(clicks);

      // Capture iris position for webcam calibration
      if (source && samples) {
        const raw = source.lastRaw;
        if (raw) {
          samples.push({
            screenX:   CALIB_GRID[i].x * window.innerWidth,
            screenY:   CALIB_GRID[i].y * window.innerHeight,
            rawGazeX:  raw.x,
            rawGazeY:  raw.y,
          });
        }
      }

      if (clicks >= CLICKS_PER_DOT) advance();
    };

    dots.forEach((dot, i) => dot.addEventListener('click', () => onClick(i)));

    document.getElementById('btn-skip-calib')!.addEventListener('click', () => {
      surface.innerHTML = '';
      if (onDone && samples) onDone(samples);
      resolve();
    }, { once: true });
  });
}

// ── Tile grid ─────────────────────────────────────────────────────────────────

const CIRC = 2 * Math.PI * 44; // SVG ring circumference (r=44, viewBox 100×100)

function buildBoard(engine: GazeEngine) {
  const grid = document.getElementById('tile-grid')!;
  grid.innerHTML = '';

  for (const tile of TILES) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.id = `tile-${tile.id}`;
    el.style.setProperty('--color', tile.color);
    el.innerHTML = `
      <div class="tile-emoji">${tile.emoji}</div>
      <div class="tile-label">${tile.label}</div>
      <svg class="progress-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="ring-track" cx="50" cy="50" r="44"/>
        <circle class="ring-fill"  cx="50" cy="50" r="44"
          stroke-dasharray="${CIRC.toFixed(2)}"
          stroke-dashoffset="${CIRC.toFixed(2)}"/>
      </svg>`;
    grid.appendChild(el);
  }

  requestAnimationFrame(() => {
    for (const tile of TILES) {
      const r = document.getElementById(`tile-${tile.id}`)!.getBoundingClientRect();
      engine.registerTarget({ id: tile.id, rect: { x: r.left, y: r.top, width: r.width, height: r.height }, label: tile.label });
    }
  });
}

// ── Gaze cursor ───────────────────────────────────────────────────────────────

function moveCursor(x: number, y: number) {
  const el = document.getElementById('gaze-cursor')!;
  el.style.left = `${x}px`;
  el.style.top  = `${y}px`;
}

// ── Speech ────────────────────────────────────────────────────────────────────

let currentUtterance: SpeechSynthesisUtterance | null = null;

function speak(phrase: string, tileId: string) {
  const textEl = document.getElementById('speech-text')!;
  const iconEl = document.getElementById('speech-icon')!;
  const tile   = TILES.find(t => t.id === tileId)!;

  textEl.textContent = phrase;
  textEl.classList.add('speaking');
  iconEl.textContent = tile.emoji;

  if (window.speechSynthesis) {
    if (currentUtterance) window.speechSynthesis.cancel();
    currentUtterance = new SpeechSynthesisUtterance(phrase);
    currentUtterance.rate = 0.95;
    window.speechSynthesis.speak(currentUtterance);
  }

  setTimeout(() => textEl.classList.remove('speaking'), 2500);
}

// ── Board launcher ────────────────────────────────────────────────────────────

let mpSource: MediaPipeGazeSource | null = null;

async function startBoard(source: GazeSource, modeLabel: string, calibration?: CalibrationProfile) {
  const engine = new GazeEngine(
    { dwellMs: 1200, confidenceThreshold: 0.3, filterAlpha: 0.5 },
    source,
  );
  // Load calibration into the engine so it runs in the correct pipeline order:
  // raw gaze → calibrate (iris offset → screen px) → EMA filter → dwell detect
  if (calibration) engine.loadCalibrationProfile(calibration);

  showScreen('screen-board');
  document.getElementById('mode-badge')!.textContent = modeLabel;
  buildBoard(engine);

  const cursor = document.getElementById('gaze-cursor')!;
  cursor.style.display = 'block';
  engine.onGaze(pt => moveCursor(pt.x, pt.y));

  engine.onDwellProgress((id, progress) => {
    const fill = document.querySelector(`#tile-${id} .ring-fill`) as SVGCircleElement | null;
    if (fill) fill.style.strokeDashoffset = String(CIRC * (1 - progress));
    document.getElementById(`tile-${id}`)?.classList.toggle('dwelling', progress > 0);
  });

  engine.onSelect((id) => {
    const tile = TILES.find(t => t.id === id);
    if (!tile) return;
    const el = document.getElementById(`tile-${id}`)!;
    el.classList.remove('selected');
    void el.offsetWidth;
    el.classList.add('selected');
    speak(tile.phrase, id);
    const fill = el.querySelector('.ring-fill') as SVGCircleElement | null;
    if (fill) fill.style.strokeDashoffset = String(CIRC);
    el.classList.remove('dwelling');
  });

  document.getElementById('btn-back')!.addEventListener('click', () => {
    engine.stop();
    mpSource?.shutdown();
    mpSource = null;
    cursor.style.display = 'none';
    document.getElementById('tile-grid')!.innerHTML = '';
    // Reset webcam button label
    const btn = document.getElementById('btn-webcam') as HTMLButtonElement;
    btn.textContent = '📷 Try with Webcam →';
    btn.disabled = false;
    showScreen('screen-landing');
  }, { once: true });

  window.addEventListener('resize', () => {
    engine.clearTargets();
    for (const tile of TILES) {
      const el = document.getElementById(`tile-${tile.id}`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      engine.registerTarget({ id: tile.id, rect: { x: r.left, y: r.top, width: r.width, height: r.height }, label: tile.label });
    }
  });

  await engine.start();
}

// ── Entry points ──────────────────────────────────────────────────────────────

document.getElementById('btn-mouse')!.addEventListener('click', async () => {
  await startBoard(new MouseGazeSource(), '🖱 Mouse');
});

document.getElementById('btn-webcam')!.addEventListener('click', async () => {
  const btn = document.getElementById('btn-webcam') as HTMLButtonElement;

  const setStatus = (msg: string, disabled = true) => {
    btn.textContent = msg;
    btn.disabled = disabled;
  };

  setStatus('Initializing…');

  try {
    const statusEl = document.getElementById('calib-instruction');
    mpSource = new MediaPipeGazeSource();

    // init() loads the model + opens camera; shows progress in the status element
    showScreen('screen-calibration');
    await mpSource.init(statusEl);

    // Calibration: user clicks 9 dots; we record (iris offset → screen pos) at each click
    const samples = await runWebcamCalibration(mpSource);

    // Build calibration profile — maps raw iris offset to screen coordinates.
    // Requires at least 2 samples for the linear regression; more = better accuracy.
    const calibration = samples.length >= 2
      ? buildCalibrationProfile(samples)
      : undefined;

    if (!calibration) console.warn('Too few calibration samples — gaze will be uncalibrated');

    await startBoard(mpSource, '👁 Webcam', calibration);
  } catch (err) {
    console.error('Webcam init failed:', err);
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`⚠ ${msg.slice(0, 55)}`, false);
    mpSource?.shutdown();
    mpSource = null;
    showScreen('screen-landing');
    setTimeout(() => setStatus('📷 Try with Webcam →', false), 4000);
  }
});
