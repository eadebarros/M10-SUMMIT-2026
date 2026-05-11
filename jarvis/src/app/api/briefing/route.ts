import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fetchRecentEmails } from '@/lib/gmail';
import { getMemoryFacts } from '@/lib/memory';

const client = new Anthropic();

export async function GET() {
  try {
    const [emails, memoryFacts] = await Promise.all([
      fetchRecentEmails(10),
      getMemoryFacts(),
    ]);

    const now = new Date();
    const hour = now.getHours();
    const period = hour < 12 ? 'manhã' : hour < 18 ? 'tarde' : 'noite';
    const dateStr = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const emailSummary = emails
      .slice(0, 5)
      .map((e) => `- ${e.from}: ${e.subject}`)
      .join('\n');

    const memoryBlock = memoryFacts
      .slice(0, 10)
      .map((f) => `- ${f.fact}`)
      .join('\n');

    const res = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Você é Jarvis. Crie o briefing de ${period} do Edu para hoje, ${dateStr}.

Contexto sobre o Edu:
${memoryBlock}

E-mails recentes:
${emailSummary || 'Nenhum e-mail relevante no momento.'}

Regras do briefing:
- Fale como se fosse por voz — sem bullet points, sem headers, texto corrido
- Máximo 4 frases
- Comece com "Bom ${period}, Edu."
- Mencione o que importa hoje (e-mails urgentes, se houver)
- Seja direto e útil
- Sem bajulação`,
        },
      ],
      system:
        'Você é Jarvis. Voz grave, calma, autoridade tranquila. Direto. Sem bajulação. Fale em português brasileiro.',
    });

    const briefing = res.content[0].type === 'text' ? res.content[0].text : '';

    return NextResponse.json({ briefing, period });
  } catch (err) {
    console.error('[/api/briefing]', err);
    return NextResponse.json({ error: 'Briefing falhou' }, { status: 500 });
  }
}
