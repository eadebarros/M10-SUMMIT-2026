export type SphereState =
  | 'resting'
  | 'attentive'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'alert_amber'
  | 'alert_red'
  | 'working';

export type EduEmotionalState =
  | 'accelerated'
  | 'flow'
  | 'tired'
  | 'frustrated'
  | 'strategic'
  | 'relaxed'
  | 'under_pressure'
  | 'uncertain'
  | 'neutral';

export interface Message {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

export interface MemoryFact {
  id: string;
  category: 'identity' | 'preference' | 'relationship' | 'value' | 'ambition' | 'habit' | 'context';
  fact: string;
  context?: string;
  importance: number;
  source: 'told_directly' | 'inferred' | 'conversation';
  createdAt: string;
}

export interface Episode {
  id: string;
  type: 'conversation' | 'action_taken' | 'decision_made';
  summary: string;
  importance: number;
  createdAt: string;
}

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  classification: 'ignore' | 'archive' | 'accumulate' | 'interrupt';
  reasoning?: string;
}

export interface SphereStateConfig {
  bpm: number;
  colorCore: [number, number, number];
  colorGlow: [number, number, number];
  glowIntensity: number;
  displacement: number;
  plasmaSpeed: number;
  scale: number;
}
