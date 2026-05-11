import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fetchRecentEmails } from '@/lib/gmail';
import type { GmailMessage } from '@/types';

const client = new Anthropic();

async function classifyEmails(emails: GmailMessage[]): Promise<GmailMessage[]> {
  if (emails.length === 0) return [];
  const emailList = emails.map((e,i)=>`${i+1}. De: ${e.from} | Assunto: ${e.subject} | Prévia: ${e.snippet}`).join('\n');
  const res = await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, messages: [{ role: 'user', content: `Classifique cada e-mail em: interrupt, accumulate, archive ou ignore.\nResponda APENAS com JSON: [{"index":1,"classification":"...","reasoning":"..."}]\n\nE-mails:\n${emailList}` }] });
  try {
    const text = res.content[0].type==='text'?res.content[0].text:'[]';
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) return emails;
    const c: Array<{index:number;classification:string;reasoning:string}> = JSON.parse(m[0]);
    return emails.map((email,i)=>{ const match=c.find(x=>x.index===i+1); return match?{...email,classification:match.classification as GmailMessage['classification'],reasoning:match.reasoning}:email; });
  } catch { return emails; }
}

export async function GET() {
  try {
    const raw = await fetchRecentEmails(15);
    const classified = await classifyEmails(raw);
    const order = {interrupt:0,accumulate:1,archive:2,ignore:3};
    classified.sort((a,b)=>order[a.classification]-order[b.classification]);
    return NextResponse.json({ messages: classified });
  } catch (err) {
    console.error('[/api/gmail]',err);
    return NextResponse.json({ error: 'Gmail falhou' },{ status: 500 });
  }
}
