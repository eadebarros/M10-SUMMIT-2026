/**
 * seed-sequences.js
 *
 * Populates email_sequences from the emails_templates folder.
 * Run once (or any time templates are updated):
 *   DATABASE_URL=<url> node seed-sequences.js
 *
 * Uses upsert by slug — safe to re-run.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const TEMPLATES_DIR = path.join(__dirname, 'emails_templates');

const sequences = [
  {
    slug:        'welcome',
    subject:     'Sua vaga no M10 Summit está confirmada — {{first_name}}',
    preheader:   'Bem-vindo. Aqui começa a sua jornada rumo à receita previsível.',
    file:        '01-welcome.html',
    send_mode:   'days_after_purchase',
    send_offset: 0,
  },
  {
    slug:        'd3-info',
    subject:     'O que esperar do M10 Summit',
    preheader:   'Imersão prática de 2 dias. Conteúdo que você começa a usar no mesmo dia.',
    file:        '02-d3-info.html',
    send_mode:   'days_after_purchase',
    send_offset: 3,
  },
  {
    slug:        'd7-content',
    subject:     'Os 3 pilares que vamos explorar juntos',
    preheader:   'Receita previsível não é sorte — é estrutura.',
    file:        '03-d7-content.html',
    send_mode:   'days_after_purchase',
    send_offset: 7,
  },
  {
    slug:        't-30',
    subject:     'Faltam 30 dias — prepare-se, {{first_name}}',
    preheader:   'Você está a um mês de uma experiência que pode transformar seu negócio.',
    file:        '04-t-30.html',
    send_mode:   'days_before_event',
    send_offset: -30,
  },
  {
    slug:        't-14',
    subject:     'Programação completa do M10 Summit',
    preheader:   'Aqui está tudo o que você vai aprender nos 2 dias.',
    file:        '05-t-14.html',
    send_mode:   'days_before_event',
    send_offset: -14,
  },
  {
    slug:        't-7',
    subject:     'Última semana — checklist do participante',
    preheader:   'Você está a 7 dias. Aqui está tudo o que você precisa fazer.',
    file:        '06-t-7.html',
    send_mode:   'days_before_event',
    send_offset: -7,
  },
  {
    slug:        't-3',
    subject:     'Em 3 dias tudo começa',
    preheader:   'Você está a 72 horas de uma transformação.',
    file:        '07-t-3.html',
    send_mode:   'days_before_event',
    send_offset: -3,
  },
  {
    slug:        't-1',
    subject:     'Amanhã é o dia — detalhes finais, {{first_name}}',
    preheader:   'Endereço, horário e o que levar. Tudo em um lugar.',
    file:        '08-t-1.html',
    send_mode:   'days_before_event',
    send_offset: -1,
  },
  {
    slug:        'event-day',
    subject:     'Hoje é o dia! Endereço e instruções — M10 Summit',
    preheader:   'Chegue com 15 minutos de antecedência. Estacionamento gratuito.',
    file:        '09-event-day.html',
    send_mode:   'days_before_event',
    send_offset: 0,
  },
];

async function seed() {
  for (const seq of sequences) {
    const filePath = path.join(TEMPLATES_DIR, seq.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[skip] File not found: ${seq.file}`);
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf-8');

    await pool.query(
      `INSERT INTO email_sequences (slug, subject, preheader, html, send_mode, send_offset, active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (slug) DO UPDATE SET
         subject     = EXCLUDED.subject,
         preheader   = EXCLUDED.preheader,
         html        = EXCLUDED.html,
         send_mode   = EXCLUDED.send_mode,
         send_offset = EXCLUDED.send_offset`,
      [seq.slug, seq.subject, seq.preheader, html, seq.send_mode, seq.send_offset]
    );

    console.log(`[ok] ${seq.slug}`);
  }

  console.log('\nDone. All sequences seeded.');
  await pool.end();
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
