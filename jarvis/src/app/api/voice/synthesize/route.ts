import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) return NextResponse.json({ error: 'ElevenLabs não configurado' }, { status: 503 });
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.15, use_speaker_boost: true } }),
    });
    if (!res.ok) return NextResponse.json({ error: 'TTS falhou' }, { status: 502 });
    return new NextResponse(res.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[/api/voice/synthesize]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
