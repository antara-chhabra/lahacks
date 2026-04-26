import 'dotenv/config';
import { fetchFrames } from './frames';
import { analyzeFrames } from './analyzer';

export type { SessionMessage, SessionReport, EmotionPoint, FrameData } from './types';

export async function analyzeSession(
  videoUrl: string,
  messages: import('./types').SessionMessage[],
  userId: string,
): Promise<import('./types').SessionReport> {
  const frames = await fetchFrames(videoUrl);
  return analyzeFrames(frames, messages, userId);
}
