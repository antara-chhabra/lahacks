# Catalyst for Care

An AI-powered AAC (Augmentative and Alternative Communication) system for non-verbal patients. A patient dwells their gaze on a tile; the system speaks a personalized, context-aware response and — if urgent — texts their caregivers.

## Sponsor tracks

| Track | Component |
|-------|-----------|
| Fetch.ai Agentverse | 3-agent pipeline (intent → memory → router) |
| Cloudinary | Tile icon hosting + accessibility theme transforms |
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

| Folder | Owner | What it does |
|--------|-------|-------------|
| [shared/](shared/README.md) | all | Type contracts and API spec — read before coding |
| [gaze-engine/](gaze-engine/README.md) | A | Webcam → tile-selection events (TypeScript) |
| [agents/](agents/README.md) | B | Fetch.ai uAgent pipeline + HTTP gateway |
| [cloudinary-assets/](cloudinary-assets/README.md) | C | Icon upload, theme presets, tile manifest |
| [backend/](backend/README.md) | D | REST API + MongoDB Atlas Vector Search |

## Running the app (newversion9pm branch)

This is the current working setup. Run all three services in separate terminals.

### Prerequisites

Create the following `.env` files (values are in team 1Password / Notion):

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

Open **http://localhost:5173** — click "Start with Webcam", complete the 8-point calibration, then look at tiles to compose a message. Dwell on **SEND** to fire the agent pipeline (response appears in the banner above the tiles). Dwell on **End Session** for a Gemini-generated session summary.

---

## Quick start (integration day)

```bash
# 1. backend
cd backend && cp .env.example .env  # fill in MONGODB_URI, OPENAI_API_KEY
npm install && npm run dev          # :3001

# 2. agents
cd agents && cp .env.example .env   # fill in LLM_API_KEY, ELEVENLABS_API_KEY
pip install -r requirements.txt
python bureau.py                    # starts all 3 agents + gateway on :8000

# 3. seed demo data
cd backend && npm run seed

# 4. smoke test
curl -X POST http://localhost:8000/intent \
  -H "Content-Type: application/json" \
  -d '{"dwell_target_id":"WATER","dwell_duration_ms":1350,"session_id":"s1","user_id":"demo-1","points":[]}'
```

## Branch conventions

```
main          ← stable, judges-facing
task1-gaze    ← Owner A
task2-agents  ← Owner B
task3-cdn     ← Owner C
task4-backend ← Owner D
```

Merge to `main` twice: after the day-1 stub commit, and after integration.
