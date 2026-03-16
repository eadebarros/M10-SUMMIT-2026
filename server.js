const express = require('express');
const { Pool } = require('pg');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyGJ-rvrggsDRDJesi726sE5ebalmxz9T7qcw5Vz8E8N3J1KYz0COSCBf2K5QfCo1u8ow/exec';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id        SERIAL PRIMARY KEY,
      name      TEXT,
      email     TEXT,
      phone     TEXT,
      source    TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

function forwardToSheets(params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${APPS_SCRIPT_URL}?${qs}`;
  https.get(url, (res) => res.resume()).on('error', () => {});
}

app.post('/api/lead', async (req, res) => {
  const { name = '', email = '', phone = '', source = 'Landing Page M10 Summit' } = req.body;

  try {
    await ensureTable();
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

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
