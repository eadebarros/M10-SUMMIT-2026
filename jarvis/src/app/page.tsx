'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJarvisStore } from '@/store/jarvis';
import { useVoice } from '@/hooks/useVoice';
import ExpandPanel from '@/components/ExpandPanel';

// Three.js can't SSR
const Sphere = dynamic(() => import('@/components/Sphere'), { ssr: false });

const STATE_LABELS: Record<string, string> = {
  resting: '',
  attentive: '',
  listening: 'Ouvindo…',
  thinking: 'Pensando…',
  speaking: '',
  alert_amber: 'Atenção',
  alert_red: 'Urgente',
  working: 'Trabalhando…',
};

export default function Home() {
  const { sphereState, isRecording, isSpeaking, transcript, panelOpen, setPanelOpen, error, setError } =
    useJarvisStore();

  const { startListening, stopListening } = useVoice();

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  function handleSphereClick() {
    if (isRecording) {
      stopListening();
    } else if (!isSpeaking) {
      startListening();
    }
  }

  const label = STATE_LABELS[sphereState];

  return (
    <main className="relative flex flex-col items-center justify-center min-h-dvh bg-[#0a0a0a] overflow-hidden select-none">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(200,100,0,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Sphere */}
      <motion.div
        animate={{
          scale: panelOpen ? 0.7 : 1,
          y: panelOpen ? -80 : 0,
        }}
        transition={{ type: 'spring', damping: 24, stiffness: 220 }}
        className="relative z-10"
      >
        <Sphere state={sphereState} onClick={handleSphereClick} size={280} />

        {/* Pulsing ring while recording */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1.18, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border border-amber-500/40 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* State label */}
      <AnimatePresence mode="wait">
        {label && (
          <motion.p
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-6 text-sm text-zinc-500 tracking-wider font-light"
          >
            {label}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Live transcript */}
      <AnimatePresence>
        {transcript && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 max-w-xs text-center text-zinc-400 text-sm px-6 leading-relaxed"
          >
            {transcript}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 inset-x-4 bg-red-950/90 border border-red-800/60 text-red-300 text-sm rounded-xl px-4 py-3 text-center"
            onClick={() => setError(null)}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="fixed bottom-0 inset-x-0 flex items-center justify-between px-6 pb-8 pt-4">
        {/* Hint */}
        <p className="text-xs text-zinc-700">
          {isRecording ? 'Toque para encerrar' : isSpeaking ? 'Toque para interromper' : 'Toque para falar'}
        </p>

        {/* Panel toggle */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="flex flex-col gap-[3px] p-2 rounded-lg hover:bg-zinc-900 transition-colors"
          aria-label={panelOpen ? 'Fechar painel' : 'Abrir painel'}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`block h-px bg-zinc-600 transition-all duration-300 ${
                i === 1 ? 'w-4' : 'w-5'
              } ${panelOpen && i === 1 ? 'opacity-0' : ''}`}
            />
          ))}
        </button>
      </div>

      <ExpandPanel />
    </main>
  );
}
