-- Jarvis Phase 0 — Supabase schema
CREATE TABLE edu_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('identity','preference','relationship','value','ambition','habit','context')),
  fact TEXT NOT NULL, context TEXT,
  importance INT DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  source TEXT NOT NULL CHECK (source IN ('told_directly','inferred','conversation')),
  created_at TIMESTAMPTZ DEFAULT NOW(), last_used TIMESTAMPTZ
);
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('conversation','action_taken','decision_made')),
  summary TEXT NOT NULL, importance INT DEFAULT 4 CHECK (importance BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user','jarvis')),
  content TEXT NOT NULL, audio_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO edu_memory (category, fact, importance, source) VALUES
  ('identity',   'Edu é CEO de uma agência criativa chamada IDK', 10, 'told_directly'),
  ('preference', 'Prefere respostas diretas, sem rodeios e sem bajulação', 9, 'told_directly'),
  ('value',      'Valoriza verdade antes de conforto — quer discordância quando necessário', 9, 'told_directly'),
  ('preference', 'Acorda cedo e é mais produtivo pela manhã', 7, 'told_directly');
ALTER TABLE edu_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON edu_memory FOR ALL USING (true);
CREATE POLICY "service_role_all" ON episodes FOR ALL USING (true);
CREATE POLICY "service_role_all" ON messages FOR ALL USING (true);
