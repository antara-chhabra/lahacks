import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db/client';
import { validate } from '../middleware/validate';
import { MessageHistorySchema } from '../db/schemas';
import { embed } from '../lib/embeddings';
import { embeddingQueue } from '../lib/async-queue';

const router = Router();

// POST /history — logs a routed message, generates embedding async
router.post('/', validate(MessageHistorySchema), async (req, res, next) => {
  try {
    const db = getDB();
    const result = await db.collection('message_history').insertOne({
      ...req.body,
      userId: String(req.body.userId),
      embedding: [],
      createdAt: new Date(),
    });

    // Generate embedding off the write path so response is fast
    embeddingQueue.enqueue(async () => {
      const embedding = await embed(req.body.message);
      await db.collection('message_history').updateOne(
        { _id: result.insertedId },
        { $set: { embedding } }
      );
    });

    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (err) {
    next(err);
  }
});

// GET /history/:userId — caregiver view
router.get('/:userId', async (req, res, next) => {
  try {
    const db = getDB();
    const history = await db.collection('message_history').find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 }).limit(50).toArray();
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;