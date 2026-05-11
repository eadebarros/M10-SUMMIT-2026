import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, extractNewFacts, formatMessages } from '@/lib/jarvis-core';
import { getMemoryFacts, getRecentEpisodes, saveMemoryFact, saveEpisode } from '@/lib/memory';
import type { EduEmotionalState, Message } from '@/types';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { message, history, eduState } = (await req.json()) as {
      message: string;
      history: Message[];
      eduState: EduEmotionalState;
    };

    const [memoryFacts, recentEpisodes] = await Promise.all([
      getMemoryFacts(),
      getRecentEpisodes(10),
    ]);

    const systemPrompt = buildSystemPrompt(eduState ?? 'neutral', memoryFacts, recentEpisodes);

    const conversationHistory = formatMessages(history);

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message },
      ],
    });

    const rawResponse = response.content[0].type === 'text' ? response.content[0].text : '';
    const { fact, newEduState, cleanResponse } = extractNewFacts(rawResponse);

    // Persist extracted memory in background (don't block response)
    if (fact) {
      saveMemoryFact(fact).catch(() => {});
    }

    // Save episode summary for significant exchanges
    if (message.length > 40) {
      saveEpisode({
        id: crypto.randomUUID(),
        type: 'conversation',
        summary: `Edu: "${message.slice(0, 80)}…" → Jarvis respondeu`,
        importance: 4,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }

    return NextResponse.json({
      response: cleanResponse,
      newEduState: newEduState ?? null,
    });
  } catch (err) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
