const express = require('express');
const { Pool } = require('pg');
const https = require('https');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'text/csv' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyGJ-rvrggsDRDJesi726sE5ebalmxz9T7qcw5Vz8E8N3J1KYz0COSCBf2K5QfCo1u8ow/exec';
const EVENT_DATE = new Date(process.env.EVENT_DATE || '2026-05-08');

// ─── Database setup ───────────────────────────────────────────────────────────

async function ensureAllTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id         SERIAL PRIMARY KEY,
      name       TEXT,
      email      TEXT,
      phone      TEXT,
      source     TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS buyers (
      id          SERIAL PRIMARY KEY,
      name        TEXT,
      email       TEXT UNIQUE,
      phone       TEXT,
      ticket_type TEXT,
      source      TEXT DEFAULT 'sympla',
      enrolled_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_sequences (
      id          SERIAL PRIMARY KEY,
      slug        TEXT UNIQUE,
      subject     TEXT,
      preheader   TEXT,
      html        TEXT,
      send_mode   TEXT,
      send_offset INTEGER,
      active      BOOLEAN DEFAULT TRUE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_send_log (
      id          SERIAL PRIMARY KEY,
      buyer_id    INTEGER REFERENCES buyers(id),
      sequence_id INTEGER REFERENCES email_sequences(id),
      to_email    TEXT,
      subject     TEXT,
      status      TEXT,
      error       TEXT,
      sent_at     TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function forwardToSheets(params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${APPS_SCRIPT_URL}?${qs}`;
  https.get(url, (res) => res.resume()).on('error', () => {});
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getSendDate(buyer, sequence) {
  if (sequence.send_mode === 'days_after_purchase') {
    return addDays(buyer.enrolled_at, sequence.send_offset);
  }
  // days_before_event: negative offset means before event
  return addDays(EVENT_DATE, sequence.send_offset);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

// ─── Template rendering ───────────────────────────────────────────────────────

function renderTemplate(html, buyer) {
  const nameParts = (buyer.name || '').trim().split(/\s+/);
  const vars = {
    first_name:    nameParts[0] || 'Participante',
    last_name:     nameParts.slice(1).join(' ') || '',
    name:          buyer.name || 'Participante',
    email:         buyer.email || '',
    ticket_type:   buyer.ticket_type || 'Ingresso',
    purchase_date: new Date(buyer.enrolled_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    }),
    event_link:    process.env.EVENT_LINK || 'https://m10club.com.br',
    base_url:      (process.env.BASE_URL || '').replace(/\/$/, ''),
  };
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ─── MailerSend ───────────────────────────────────────────────────────────────

async function sendEmail({ to_name, to_email, subject, html }) {
  const res = await axios.post(
    'https://api.mailersend.com/v1/email',
    {
      from: {
        email: process.env.MAIL_FROM_EMAIL || 'contato@m10club.com.br',
        name: process.env.MAIL_FROM_NAME || 'M10 Club',
      },
      to: [{ email: to_email, name: to_name || to_email }],
      subject,
      html,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.MAILERSEND_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return res.data;
}

// ─── Sympla sync ──────────────────────────────────────────────────────────────

async function runSymplaSync() {
  const token = process.env.SYMPLA_TOKEN;
  const eventId = process.env.SYMPLA_EVENT_ID;

  if (!token || !eventId) {
    console.log('[sympla] SYMPLA_TOKEN or SYMPLA_EVENT_ID not set — skipping sync');
    return;
  }

  let page = 1;
  let totalPages = 1;
  let inserted = 0;

  try {
    do {
      const { data } = await axios.get(
        `https://api.sympla.com.br/public/v3/events/${eventId}/orders`,
        {
          headers: { s_token: token },
          params: { page, page_size: 100 },
        }
      );

      totalPages = data.pagination?.total_page ?? data.pagination?.total_pages ?? 1;
      const orders = data.data ?? [];

      for (const order of orders) {
        // Sympla v3: status 'A' = approved
        if (String(order.status).toUpperCase() !== 'A') continue;

        // Buyer is always in order.buyer; participants may exist for group orders
        const candidates = [];
        if (order.buyer?.email) candidates.push({ ...order.buyer, ticket_name: order.ticket_name });
        if (Array.isArray(order.participants)) {
          order.participants.forEach((p) => { if (p.email) candidates.push(p); });
        }
        if (!candidates.length) continue;

        for (const p of candidates) {
          const email = p.email || '';
          if (!email) continue;

          const name = p.first_name
            ? `${p.first_name} ${p.last_name || ''}`.trim()
            : p.name || '';
          const phone = p.phone || p.cell_phone || p.cpf || '';
          const ticket_type = p.ticket_name || order.ticket_name || '';

          const result = await pool.query(
            `INSERT INTO buyers (name, email, phone, ticket_type, source)
             VALUES ($1, $2, $3, $4, 'sympla_sync')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [name, email, phone, ticket_type]
          );

          if (result.rows.length > 0) {
            inserted++;
            console.log(`[sympla] New buyer: ${email}`);
          }
        }
      }

      page++;
    } while (page <= totalPages);

    if (inserted > 0) console.log(`[sympla] Sync done — ${inserted} new buyer(s)`);
  } catch (err) {
    console.error('[sympla] Sync error:', err.message);
  }
}

// ─── Email cron ───────────────────────────────────────────────────────────────

async function runEmailCron() {
  try {
    const { rows: sequences } = await pool.query(
      'SELECT * FROM email_sequences WHERE active = TRUE'
    );
    if (!sequences.length) return;

    const { rows: buyers } = await pool.query('SELECT * FROM buyers');
    if (!buyers.length) return;

    const now = new Date();

    for (const sequence of sequences) {
      for (const buyer of buyers) {
        const sendDate = getSendDate(buyer, sequence);

        // Only send if scheduled time is in the past (or now)
        if (sendDate > now) continue;

        // For fixed-date sequences, skip buyers who enrolled AFTER the send date
        // (they missed this email — only upcoming emails should reach them)
        if (sequence.send_mode === 'days_before_event' && new Date(buyer.enrolled_at) > sendDate) continue;

        // Check if already sent
        const { rows: logs } = await pool.query(
          'SELECT id FROM email_send_log WHERE buyer_id = $1 AND sequence_id = $2 AND status = $3',
          [buyer.id, sequence.id, 'sent']
        );
        if (logs.length > 0) continue;

        // Send
        let status = 'sent';
        let error = null;
        try {
          await sendEmail({
            to_name: buyer.name,
            to_email: buyer.email,
            subject: renderTemplate(sequence.subject, buyer),
            html: renderTemplate(sequence.html, buyer),
          });
        } catch (err) {
          status = 'error';
          error = err.message;
          console.error(`[cron] Failed to send "${sequence.slug}" to ${buyer.email}:`, err.message);
        }

        await pool.query(
          'INSERT INTO email_send_log (buyer_id, sequence_id, to_email, subject, status, error) VALUES ($1,$2,$3,$4,$5,$6)',
          [buyer.id, sequence.id, buyer.email, sequence.subject, status, error]
        );

        if (status === 'sent') {
          console.log(`[cron] Sent "${sequence.slug}" to ${buyer.email}`);
        }
      }
    }
  } catch (err) {
    console.error('[cron] Error:', err.message);
  }
}

// ─── Admin middleware ─────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const password = req.headers['x-admin-password'] || req.query.p;
  if (!process.env.ADMIN_PASSWORD || password === process.env.ADMIN_PASSWORD) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// ─── Routes: public ───────────────────────────────────────────────────────────

app.post('/api/lead', async (req, res) => {
  const { name = '', email = '', phone = '', source = 'Landing Page M10 Summit' } = req.body;

  try {
    await ensureAllTables();
    await pool.query(
      'INSERT INTO leads (name, email, phone, source) VALUES ($1, $2, $3, $4)',
      [name, email, phone, source]
    );
  } catch (err) {
    console.error('DB error:', err.message);
  }

  forwardToSheets({ name, email, phone, source });
  res.json({ status: 'ok' });
});

// ─── Routes: Sympla webhook ───────────────────────────────────────────────────

app.post('/api/webhook/sympla', async (req, res) => {
  const body = req.body;

  // Sympla sends status 'A' for approved orders
  if (body.status !== 'A') {
    return res.json({ status: 'ignored', reason: 'not approved' });
  }

  const buyer = body.buyer || {};
  const name = buyer.first_name
    ? `${buyer.first_name} ${buyer.last_name || ''}`.trim()
    : buyer.name || '';
  const email = buyer.email || '';
  const phone = buyer.cpf || buyer.phone || '';
  const ticket_type = (body.ticket && body.ticket.name) || '';

  if (!email) return res.status(400).json({ error: 'No email in payload' });

  try {
    await pool.query(
      `INSERT INTO buyers (name, email, phone, ticket_type, source)
       VALUES ($1, $2, $3, $4, 'sympla_webhook')
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         ticket_type = EXCLUDED.ticket_type`,
      [name, email, phone, ticket_type]
    );
    console.log(`[webhook] Buyer upserted: ${email}`);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[webhook] DB error:', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

// ─── Routes: admin HTML ───────────────────────────────────────────────────────

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ─── Routes: admin API ────────────────────────────────────────────────────────

// Buyers
app.get('/api/admin/buyers', adminAuth, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM buyers ORDER BY enrolled_at DESC');
  res.json(rows);
});

app.post('/api/admin/buyers', adminAuth, async (req, res) => {
  const { name, email, phone, ticket_type = '', source = 'manual' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO buyers (name, email, phone, ticket_type, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name, phone = EXCLUDED.phone, ticket_type = EXCLUDED.ticket_type
       RETURNING *`,
      [name, email, phone, ticket_type, source]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/buyers/import', adminAuth, async (req, res) => {
  let csvText = '';
  if (typeof req.body === 'string') {
    csvText = req.body;
  } else if (req.body && req.body.csv) {
    csvText = req.body.csv;
  } else {
    return res.status(400).json({ error: 'Send CSV as text/csv body or JSON field "csv"' });
  }

  const rows = parseCSV(csvText);
  if (!rows.length) return res.status(400).json({ error: 'No rows found in CSV' });

  let inserted = 0;
  let errors = [];

  for (const row of rows) {
    const email = row.email || row.e_mail || '';
    if (!email) continue;
    const name = row.name || row.nome || '';
    const phone = row.phone || row.telefone || row.whatsapp || '';
    const ticket_type = row.ticket_type || row.ticket || row.ingresso || '';
    try {
      await pool.query(
        `INSERT INTO buyers (name, email, phone, ticket_type, source)
         VALUES ($1, $2, $3, $4, 'csv_import')
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name, phone = EXCLUDED.phone, ticket_type = EXCLUDED.ticket_type`,
        [name, email, phone, ticket_type]
      );
      inserted++;
    } catch (err) {
      errors.push({ email, error: err.message });
    }
  }

  res.json({ inserted, errors });
});

// Sequences
app.get('/api/admin/sequences', adminAuth, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM email_sequences ORDER BY id');
  res.json(rows);
});

app.post('/api/admin/sequences', adminAuth, async (req, res) => {
  const { slug, subject, preheader, html, send_mode, send_offset, active = true } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO email_sequences (slug, subject, preheader, html, send_mode, send_offset, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [slug, subject, preheader, html, send_mode, send_offset, active]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/sequences/:id', adminAuth, async (req, res) => {
  const { subject, preheader, html, send_mode, send_offset, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE email_sequences
       SET subject=$1, preheader=$2, html=$3, send_mode=$4, send_offset=$5, active=$6
       WHERE id=$7 RETURNING *`,
      [subject, preheader, html, send_mode, send_offset, active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email log
app.get('/api/admin/email-log', adminAuth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const { rows } = await pool.query(
    `SELECT l.*, b.name as buyer_name, s.slug as sequence_slug
     FROM email_send_log l
     LEFT JOIN buyers b ON b.id = l.buyer_id
     LEFT JOIN email_sequences s ON s.id = l.sequence_id
     ORDER BY l.sent_at DESC LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// Debug: show raw Sympla response for first page
app.get('/api/admin/sympla-debug', adminAuth, async (_req, res) => {
  const token = process.env.SYMPLA_TOKEN;
  const eventId = process.env.SYMPLA_EVENT_ID;
  if (!token || !eventId) return res.status(400).json({ error: 'SYMPLA_TOKEN or SYMPLA_EVENT_ID not set' });
  try {
    const { data } = await axios.get(
      `https://api.sympla.com.br/public/v3/events/${eventId}/orders`,
      { headers: { s_token: token }, params: { page: 1, page_size: 3 } }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, response: err.response?.data });
  }
});

// Trigger Sympla sync manually
app.post('/api/admin/sympla-sync', adminAuth, async (_req, res) => {
  try {
    await runSymplaSync();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test email
app.post('/api/admin/email-test', adminAuth, async (req, res) => {
  const { to_email, to_name, subject, html } = req.body;
  if (!to_email) return res.status(400).json({ error: 'to_email required' });
  try {
    await sendEmail({
      to_email,
      to_name: to_name || to_email,
      subject: subject || '[Teste] M10 Summit',
      html: html || '<p>Este é um e-mail de teste.</p>',
    });
    res.json({ status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Static + catch-all ───────────────────────────────────────────────────────

app.use(express.static(__dirname));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

ensureAllTables()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Sympla sync: run immediately then every 15 minutes
    runSymplaSync();
    setInterval(runSymplaSync, 15 * 60 * 1000);

    // Email cron: run immediately then every hour
    runEmailCron();
    setInterval(runEmailCron, 60 * 60 * 1000);
  })
  .catch((err) => {
    console.error('Failed to initialize tables:', err.message);
    process.exit(1);
  });
