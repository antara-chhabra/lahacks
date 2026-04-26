import { getDB } from '../db/client';

export async function findSimilarPhrases(
  userId: string,
  embedding: number[],
  limit: number = 5
): Promise<any[]> {
  const db = getDB();

  // numCandidates is larger than limit so we get enough results after the
  // userId $match (the Atlas vector index doesn't have userId as a filter field,
  // so we filter in the pipeline instead).
  const results = await db.collection('phrases').aggregate([
    {
      $vectorSearch: {
        index: 'phrases_vector_index',
        path: 'embedding',
        queryVector: embedding,
        numCandidates: Math.max(limit * 20, 100),
        limit: Math.max(limit * 10, 50),
      },
    },
    { $match: { userId } },
    { $limit: limit },
    {
      $project: {
        text: 1,
        category: 1,
        usageCount: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]).toArray();

  return results;
}