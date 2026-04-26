# EyeText — Gaze-Powered AAC

An AI-powered AAC (Augmentative and Alternative Communication) system for non-verbal patients, people with disabilities, and elderly users. A patient dwells their gaze on a tile; the system speaks a personalized, context-aware response and — if urgent — notifies their caregivers.

> **Tagline:** Your eyes are the new keyboard.

## Sponsor tracks

| Track | Component |
|-------|-----------|
| Fetch.ai Agentverse | 3-agent pipeline (intent → memory → router) |
| Cloudinary | Tile icon hosting + session video upload |
| MongoDB Atlas | Vector search for personalized phrase prediction |
| ElevenLabs | Voice synthesis in the Router Agent |

## Architecture

```
Webcam
  └─► gaze-engine (TS lib)
          └─► POST /intent  ──► agents/ (Fetch.ai uAgents)
                                    ├─ Intent Agent   (classify)
                                    ├─ Memory Agent   (retrieve + LLM generate)
                                    └─ Router Agent   (TTS + SMS + log)
                                          └─► backend/ (MongoDB + Express)
                                                └─► caregiver dashboard
```

## Repos / folders

| Folder | What it does |
|--------|-------------|
| [gaze-engine/](gaze-engine/README.md) | Webcam → tile-selection events (TypeScript, MediaPipe) |
| [agents/](agents/README.md) | Fetch.ai uAgent pipeline + HTTP gateway |
| [backend/](backend/README.md) | REST API + MongoDB Atlas Vector Search + Gemini session analysis |
| [shared/](shared/README.md) | Type contracts and API spec |
| [cloudinary-assets/](cloudinary-assets/README.md) | Icon upload, theme presets, tile manifest |

---

## Running the app (`newversion3am` branch)

Run all three services in separate terminals.

### Prerequisites

Create the following `.env` files (values in team 1Password / Notion):

**`backend/.env`**
```
MONGODB_URI=<atlas connection string>
GEMINI_API_KEY=<google ai studio key>
CLOUDINARY_CLOUD_NAME=dsddkg2x6
CLOUDINARY_API_KEY=<cloudinary api key>
CLOUDINARY_API_SECRET=<cloudinary api secret>
PORT=3001
```

**`frontend/.env`**
```
VITE_CLOUDINARY_CLOUD_NAME=dsddkg2x6
VITE_CLOUDINARY_UPLOAD_PRESET=Lahacks
VITE_AGENT_URL=http://localhost:8000
VITE_BACKEND_URL=http://localhost:3001
VITE_DEMO_USER_ID=demo-1
```

**`agents/.env`**
```
ASI1_API_KEY=<asi1 api key>
```

### Terminal 1 — Backend (port 3001)

```bash
cd backend
npm install
npm run dev
```

### Terminal 2 — Agent gateway (port 8000)

```bash
cd agents
pip3 install fastapi python-dotenv
python3 http_gateway.py
```

### Terminal 3 — Gaze-engine demo (port 5173)

```bash
cd gaze-engine
npm install
npm run dev
```

Open **http://localhost:5173**, click "Start with Webcam", complete the 7-point calibration, select a mode (Talk or Help), then communicate by looking.

---

## User flow

```
Landing → Calibration (7 dots) → Mode Select → Board
```

### Talk mode
Build sentences word by word using gaze. Words update automatically using AI-powered next-word prediction. Dwell on **SEND** to fire the agent pipeline — a spoken + text response appears. Keyboard shortcuts: `Space` = Send, `Backspace` = Undo.

### Help mode
5 instant-speak tiles (🆘 Help me · 😣 In Pain · 💧 Water · 🍽️ Food · 🚽 Bathroom). Look at a tile and it speaks immediately — no SEND needed. Toggle between Talk and Help at any time using the mode switch in the board header.

### Session Summary
Press **📋 Summary** at any time to generate a Gemini-powered session analysis (emotional arc, clinical notes, key moments). The engine keeps running — close the modal and continue communicating. Each mode keeps its own summary.

---

## Gaze engine details

- **Tracking:** MediaPipe FaceLandmarker — iris position relative to eye width
- **Calibration:** 7-point grid, IDW + linear blend for edge extrapolation
- **Smoothing:** Two-stage filter — EMA (`filterAlpha: 0.08`) removes tremor; fixation zone (14px dead-zone) locks cursor when eye is still
- **Dwell:** 1500ms of stable gaze triggers selection with circular progress ring feedback
- **Hit areas:** SEND/UNDO extend to full screen edges; toggle buttons have 52px extra padding each side

---

## Branch conventions

```
main              ← stable, judges-facing
newversion9pm     ← previous working version
newversion3am     ← current (EyeText rebrand, Talk/Help modes, gaze improvements)
task1-gaze        ← Owner A
task2-agents      ← Owner B
task3-cdn         ← Owner C
task4-backend     ← Owner D
```
