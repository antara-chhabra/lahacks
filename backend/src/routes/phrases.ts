import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db/client';
import { validate } from '../middleware/validate';
import { PhraseSchema } from '../db/schemas';
import { embed } from '../lib/embeddings';
import { findSimilarPhrases } from '../lib/vector-search';

const router = Router();

// GET /phrases/:userId
router.get('/:userId', async (req, res, next) => {
  try {
    const db = getDB();
    const phrases = await db.collection('phrases').find({
      userId: req.params.userId,
    }).toArray();
    res.json(phrases);
  } catch (err) {
    next(err);
  }
});

// POST /phrases
router.post('/', validate(PhraseSchema), async (req, res, next) => {
  try {
    const db = getDB();
    const embedding = await embed(req.body.text);
    const result = await db.collection('phrases').insertOne({
      ...req.body,
      userId: String(req.body.userId),
      embedding,
      usageCount: 0,
      createdAt: new Date(),
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (err) {
    next(err);
  }
});

// POST /phrases/predict — headline feature
router.post('/predict', async (req, res, next) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text) {
      return res.status(400).json({ error: 'userId and text are required' });
    }
    const embedding = await embed(text);
    const similar = await findSimilarPhrases(userId, embedding, 5);
    res.json({ predictions: similar });
  } catch (err) {
    next(err);
  }
});

// DELETE /phrases/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    await db.collection('phrases').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;