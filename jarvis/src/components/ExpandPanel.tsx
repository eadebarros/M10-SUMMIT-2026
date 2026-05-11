'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useJarvisStore } from '@/store/jarvis';
import type { GmailMessage } from '@/types';

const badge = (c:GmailMessage['classification'])=>({interrupt:'bg-red-900/60 text-red-300 border border-red-700',accumulate:'bg-amber-900/40 text-amber-300 border border-amber-700/50',archive:'bg-zinc-800 text-zinc-400 border border-zinc-700',ignore:'bg-zinc-900 text-zinc-600 border border-zinc-800'}[c]);
const label = (c:GmailMessage['classification'])=>({interrupt:'urgente',accumulate:'briefing',archive:'arquivo',ignore:'ignorar'}[c]);

export default function ExpandPanel() {
  const { panelOpen, setPanelOpen, messages, gmailMessages } = useJarvisStore();
  return (
    <AnimatePresence>
      {panelOpen && (
        <motion.div initial={{opacity:0,y:'100%'}} animate={{opacity:1,y:0}} exit={{opacity:0,y:'100%'}} transition={{type:'spring',damping:28,stiffness:280}} className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-xl rounded-t-3xl border-t border-zinc-800/60 max-h-[80vh]">
          <div className="flex justify-center pt-3 pb-1"><button onClick={()=>setPanelOpen(false)} className="w-10 h-1 rounded-full bg-zinc-700 hover:bg-zinc-500 transition-colors" aria-label="Fechar painel"/></div>
          <div className="overflow-y-auto px-5 pb-8 space-y-6">
            {messages.length>0&&(<section><h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Conversa</h2><div className="space-y-3">{messages.slice(-8).map(msg=>(<div key={msg.id} className={`flex gap-2 ${msg.role==='jarvis'?'justify-start':'justify-end'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role==='jarvis'?'bg-zinc-800/80 text-zinc-200 rounded-tl-sm':'bg-amber-900/40 text-amber-100 border border-amber-800/40 rounded-tr-sm'}`}>{msg.content}</div></div>))}</div></section>)}
            {gmailMessages.length>0&&(<section><h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">E-mails recentes</h2><div className="space-y-2">{gmailMessages.slice(0,6).map(msg=>(<div key={msg.id} className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/50"><div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><p className="text-xs text-zinc-400 truncate">{msg.from}</p><p className="text-sm text-zinc-200 font-medium truncate mt-0.5">{msg.subject}</p><p className="text-xs text-zinc-500 mt-1 line-clamp-2">{msg.snippet}</p></div><span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge(msg.classification)}`}>{label(msg.classification)}</span></div></div>))}</div></section>)}
            {messages.length===0&&gmailMessages.length===0&&(<p className="text-center text-zinc-600 text-sm py-8">Nenhuma atividade ainda.</p>)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
