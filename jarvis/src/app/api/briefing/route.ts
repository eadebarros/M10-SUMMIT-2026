import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fetchRecentEmails } from '@/lib/gmail';
import { getMemoryFacts } from '@/lib/memory';

const client = new Anthropic();

export async function GET() {
  try {
    const [emails, memoryFacts] = await Promise.all([fetchRecentEmails(10), getMemoryFacts()]);
    const now = new Date();
    const hour = now.getHours();
    const period = hour < 12 ? 'manhã' : hour < 18 ? 'tarde' : 'noite';
    const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const emailSummary = emails.slice(0,5).map(e=>`- ${e.from}: ${e.subject}`).join('\n');
    const memoryBlock = memoryFacts.slice(0,10).map(f=>`- ${f.fact}`).join('\n');
    const res = await client.messages.create({
      model: 'claude-opus-4-7', max_tokens: 600,
      system: 'Você é Jarvis. Voz grave, calma, autoridade tranquila. Direto. Sem bajulação. Português brasileiro.',
      messages: [{ role: 'user', content: `Crie o briefing de ${period} do Edu para hoje, ${dateStr}.\n\nContexto:\n${memoryBlock}\n\nE-mails:\n${emailSummary||'Nenhum relevante.'}\n\nRegras: voz (sem bullets), máximo 4 frases, comece com "Bom ${period}, Edu.", direto, sem bajulação.` }],
    });
    return NextResponse.json({ briefing: res.content[0].type==='text'?res.content[0].text:'', period });
  } catch (err) {
    console.error('[/api/briefing]',err);
    return NextResponse.json({ error: 'Briefing falhou' },{ status: 500 });
  }
}
