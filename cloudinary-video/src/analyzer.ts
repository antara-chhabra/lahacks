import { GoogleGenerativeAI } from '@google/generative-ai';
import type { FrameData, SessionMessage, SessionReport } from './types';

export async function analyzeFrames(
  frames: FrameData[],
  messages: SessionMessage[],
  _userId: string,
): Promise<SessionReport> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const conversationText = messages.length
    ? messages
        .map(m => `[${new Date(m.timestamp).toISOString()}] (urgency ${m.urgency}) ${m.text}`)
        .join('\n')
    : '(no messages recorded this session)';

  const imageParts = frames.map(f => ({
    inlineData: { mimeType: f.mimeType as 'image/jpeg', data: f.base64 },
  }));

  const prompt = `You are analyzing a care session for a patient using an eye-driven AAC (Augmentative and Alternative Communication) system. The patient has limited mobility (e.g., ALS) and communicates by gazing at word tiles.

CONVERSATION MESSAGES (${messages.length} total):
${conversationText}

You are provided ${frames.length} webcam frame snapshot(s) of the patient at timestamps: ${frames.map(f => f.time).join(', ')}.

Analyze the patient's facial expressions and body language across these frames, combined with the conversation content above.

Respond ONLY with a valid JSON object (no markdown fences, no extra text) with exactly these fields:
{
  "emotion_timeline": [
    {"time": "0%", "emotion": "calm"},
    {"time": "33%", "emotion": "focused"},
    {"time": "66%", "emotion": "tired"},
    {"time": "99%", "emotion": "relieved"}
  ],
  "communication_summary": "A single paragraph summarizing what the patient communicated during this session and how effectively.",
  "caregiver_notes": "Two to three sentences with actionable observations for the caregiver — comfort level, apparent needs, suggestions for next session.",
  "total_messages": ${messages.length}
}`;

  const result = await model.generateContent(
    frames.length > 0 ? [prompt, ...imageParts] : [prompt],
  );
  const raw = result.response.text().trim();

  // Strip markdown fences if model ignores instructions
  const clean = raw.startsWith('```')
    ? raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    : raw;

  const parsed = JSON.parse(clean) as Omit<SessionReport, 'analyzed_at'>;
  return { ...parsed, analyzed_at: Date.now() };
}
