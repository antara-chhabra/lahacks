import { Router } from 'express';
import { getDB } from '../db/client';
import { analyzeSession } from '../lib/claude-analyzer';
import type { SessionData } from '../lib/claude-analyzer';

const router = Router();

// POST /session/end — stop recording, analyze with Claude, save summary
router.post('/end', async (req, res, next) => {
  try {
    const data = req.body as SessionData;

    const summary = await analyzeSession(data);

    const db = getDB();
    await db.collection('session_summaries').insertOne({
      ...data,
      summary,
      createdAt: new Date(),
    });

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export default router;
