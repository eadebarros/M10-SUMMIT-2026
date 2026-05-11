'use client';

import { create } from 'zustand';
import type { SphereState, Message, EduEmotionalState, GmailMessage } from '@/types';

interface JarvisStore {
  sphereState: SphereState;
  setSphereState: (state: SphereState) => void;
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  setRecording: (v: boolean) => void;
  setSpeaking: (v: boolean) => void;
  setTranscript: (t: string) => void;
  messages: Message[];
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
  eduState: EduEmotionalState;
  setEduState: (s: EduEmotionalState) => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  gmailMessages: GmailMessage[];
  setGmailMessages: (msgs: GmailMessage[]) => void;
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
