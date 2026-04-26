export interface SessionMessage {
  text: string;
  urgency: number;
  timestamp: number;
}

export interface EmotionPoint {
  time: string;
  emotion: string;
}

export interface SessionReport {
  emotion_timeline: EmotionPoint[];
  communication_summary: string;
  caregiver_notes: string;
  total_messages: number;
  analyzed_at: number;
}

export interface FrameData {
  time: string;
  base64: string;
  mimeType: 'image/jpeg';
}
