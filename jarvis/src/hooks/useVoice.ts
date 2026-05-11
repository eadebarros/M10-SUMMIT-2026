'use client';

import { useRef, useCallback } from 'react';
import { useJarvisStore } from '@/store/jarvis';
import type { Message } from '@/types';

declare global { interface Window { SpeechRecognition: typeof SpeechRecognition; webkitSpeechRecognition: typeof SpeechRecognition; } }

export function useVoice() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { setSphereState, setRecording, setSpeaking, setTranscript, addMessage, messages, eduState, setEduState, setError } = useJarvisStore();

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeaking(false); setSphereState('resting');
  }, [setSpeaking, setSphereState]);

  const speak = useCallback(async (text: string) => {
    setSphereState('speaking'); setSpeaking(true);
    try {
      const res = await fetch('/api/voice/synthesize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error('TTS falhou');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); stopSpeaking(); };
      audio.onerror = () => { URL.revokeObjectURL(url); stopSpeaking(); };
      await audio.play();
    } catch { stopSpeaking(); }
  }, [setSphereState, setSpeaking, stopSpeaking]);

  const sendToJarvis = useCallback(async (userText: string) => {
    setSphereState('thinking');
    addMessage({ id: crypto.randomUUID(), role: 'user', content: userText, timestamp: new Date() });
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userText, history: messages.slice(-10), eduState }) });
      if (!res.ok) throw new Error('Chat API falhou');
      const { response, newEduState } = await res.json();
      if (newEduState) setEduState(newEduState);
      addMessage({ id: crypto.randomUUID(), role: 'jarvis', content: response, timestamp: new Date() });
      await speak(response);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro desconhecido'); setSphereState('resting'); }
  }, [messages, eduState, setSphereState, addMessage, setEduState, speak, setError]);

  const startListening = useCallback(() => {
    stopSpeaking();
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setError('Web Speech API não suportada. Use Chrome.'); return; }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'pt-BR'; recognition.interimResults = true; recognition.maxAlternatives = 1; recognition.continuous = false;
    setSphereState('listening'); setRecording(true); setTranscript('');
    recognition.onresult = (event) => {
      let interim = '', final = '';
      for (const result of event.results) { if (result.isFinal) final += result[0].transcript; else interim += result[0].transcript; }
      setTranscript(final || interim);
    };
    recognition.onend = () => {
      setRecording(false);
      const t = useJarvisStore.getState().transcript.trim();
      if (t) sendToJarvis(t); else setSphereState('resting');
    };
    recognition.onerror = (e) => { setRecording(false); setSphereState('resting'); if (e.error !== 'no-speech') setError(`Microfone: ${e.error}`); };
    recognition.start();
  }, [stopSpeaking, setSphereState, setRecording, setTranscript, sendToJarvis, setError]);

  const stopListening = useCallback(() => { recognitionRef.current?.stop(); recognitionRef.current = null; }, []);
  return { startListening, stopListening, stopSpeaking };
}
