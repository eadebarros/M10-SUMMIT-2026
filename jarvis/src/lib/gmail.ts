import { google } from 'googleapis';
import type { GmailMessage } from '@/types';

function getGmailClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

export async function fetchRecentEmails(maxResults = 20): Promise<GmailMessage[]> {
  const gmail = getGmailClient();
  if (!gmail) return getMockEmails();
  const list = await gmail.users.messages.list({ userId: 'me', maxResults, q: 'in:inbox -category:promotions -category:social' });
  const messageIds = list.data.messages ?? [];
  const messages = await Promise.all(
    messageIds.map(async ({ id }) => {
      const msg = await gmail.users.messages.get({ userId: 'me', id: id! });
      const headers = msg.data.payload?.headers ?? [];
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? '';
      return { id: id!, from: get('From'), subject: get('Subject'), snippet: msg.data.snippet ?? '', date: get('Date'), classification: 'accumulate' as const } satisfies GmailMessage;
    })
  );
  return messages;
}

function getMockEmails(): GmailMessage[] {
  return [
    { id: 'mock-1', from: 'cliente@empresa.com', subject: 'Proposta comercial — IDK Agency', snippet: 'Boa tarde, seguem os detalhes da proposta conforme conversamos...', date: new Date().toISOString(), classification: 'accumulate' },
    { id: 'mock-2', from: 'financeiro@banco.com.br', subject: 'Extrato de conta — Maio 2026', snippet: 'Seu extrato do mês de maio está disponível...', date: new Date().toISOString(), classification: 'archive' },
  ];
}
