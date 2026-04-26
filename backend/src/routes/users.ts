import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db/client';
import { validate } from '../middleware/validate';
import { UserSchema } from '../db/schemas';

const router = Router();

// GET /users/:id/profile
router.get('/:id/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const rawId = req.params['id'] as string;
    const filter = ObjectId.isValid(rawId) && rawId.length === 24
      ? { _id: new ObjectId(rawId) }
      : { userId: rawId };
    const user = await db.collection('users').findOne(filter);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

// POST /users
router.post('/', validate(UserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const result = await db.collection('users').insertOne({
      ...req.body,
      caregiverIds: [],
      createdAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (err) { next(err); }
});

// PUT /users/:id
router.put('/:id', validate(UserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params['id'] as string) },
      { $set: req.body }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /users/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    await db.collection('users').deleteOne({
      _id: new ObjectId(req.params['id'] as string)
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;