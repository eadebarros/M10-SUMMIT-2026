'use client';

import { create } from 'zustand';
import type { SphereState, Message, EduEmotionalState, GmailMessage } from '@/types';

interface JarvisStore {
  // Sphere
  sphereState: SphereState;
  setSphereState: (state: SphereState) => void;

  // Voice
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  setRecording: (v: boolean) => void;
  setSpeaking: (v: boolean) => void;
  setTranscript: (t: string) => void;

  // Conversation
  messages: Message[];
  addMessage: (msg: Message) => void;
  clearMessages: () => void;

  // Edu emotional state (detected by Jarvis)
  eduState: EduEmotionalState;
  setEduState: (s: EduEmotionalState) => void;

  // Panel
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;

  // Gmail
  gmailMessages: GmailMessage[];
  setGmailMessages: (msgs: GmailMessage[]) => void;

  // Error
  error: string | null;
  setError: (e: string | null) => void;
}

export const useJarvisStore = create<JarvisStore>((set) => ({
  sphereState: 'resting',
  setSphereState: (state) => set({ sphereState: state }),

  isRecording: false,
  isSpeaking: false,
  transcript: '',
  setRecording: (v) => set({ isRecording: v }),
  setSpeaking: (v) => set({ isSpeaking: v }),
  setTranscript: (t) => set({ transcript: t }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages.slice(-49), msg] })),
  clearMessages: () => set({ messages: [] }),

  eduState: 'neutral',
  setEduState: (s) => set({ eduState: s }),

  panelOpen: false,
  setPanelOpen: (v) => set({ panelOpen: v }),

  gmailMessages: [],
  setGmailMessages: (msgs) => set({ gmailMessages: msgs }),

  error: null,
  setError: (e) => set({ error: e }),
}));
