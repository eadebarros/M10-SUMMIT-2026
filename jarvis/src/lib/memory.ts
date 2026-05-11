import { createClient } from '@supabase/supabase-js';
import type { MemoryFact, Episode, Message } from '@/types';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── Memory facts ──────────────────────────────────────────────────────────────

export async function getMemoryFacts(): Promise<MemoryFact[]> {
  const db = getClient();
  if (!db) return getFallbackFacts();

  const { data, error } = await db
    .from('edu_memory')
    .select('*')
    .order('importance', { ascending: false })
    .limit(50);

  if (error || !data) return getFallbackFacts();
  return data as MemoryFact[];
}

export async function saveMemoryFact(fact: MemoryFact): Promise<void> {
  const db = getClient();
  if (!db) return;
  await db.from('edu_memory').insert({
    id: fact.id,
    category: fact.category,
    fact: fact.fact,
    context: fact.context,
    importance: fact.importance,
    source: fact.source,
    created_at: fact.createdAt,
  });
}

// Baseline facts about Edu — seeded before Supabase is configured
function getFallbackFacts(): MemoryFact[] {
  return [
    {
      id: '1',
      category: 'identity',
      fact: 'Edu é CEO de uma agência criativa chamada IDK',
      importance: 10,
      source: 'told_directly',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      category: 'preference',
      fact: 'Prefere respostas diretas, sem rodeios e sem bajulação',
      importance: 9,
      source: 'told_directly',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      category: 'value',
      fact: 'Valoriza verdade antes de conforto — quer discordância quando necessário',
      importance: 9,
      source: 'told_directly',
      createdAt: new Date().toISOString(),
    },
  ];
}

// ── Episodes ──────────────────────────────────────────────────────────────────

export async function getRecentEpisodes(limit = 10): Promise<Episode[]> {
  const db = getClient();
  if (!db) return [];

  const { data } = await db
    .from('episodes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data as Episode[]) ?? [];
}

export async function saveEpisode(episode: Episode): Promise<void> {
  const db = getClient();
  if (!db) return;
  await db.from('episodes').insert({
    id: episode.id,
    type: episode.type,
    summary: episode.summary,
    importance: episode.importance,
    created_at: episode.createdAt,
  });
}

// ── Messages (session history) ────────────────────────────────────────────────

export async function saveMessage(message: Message): Promise<void> {
  const db = getClient();
  if (!db) return;
  await db.from('messages').insert({
    id: message.id,
    role: message.role,
    content: message.content,
    audio_url: message.audioUrl,
    created_at: message.timestamp.toISOString(),
  });
}

export async function getRecentMessages(limit = 20): Promise<Message[]> {
  const db = getClient();
  if (!db) return [];

  const { data } = await db
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as Message[]).reverse();
}
