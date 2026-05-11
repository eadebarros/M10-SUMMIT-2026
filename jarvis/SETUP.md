# Jarvis — Setup Phase 0

## 1. Instalar dependências
```bash
cd jarvis
npm install
```

## 2. Configurar variáveis de ambiente
```bash
cp .env.example .env.local
# Edite .env.local com suas chaves
```

Obrigatórias para Phase 0:
- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`

Opcionais (degradam graciosamente):
- Supabase — memória sem persistência se ausente
- Google OAuth2 — Gmail mostra mock se ausente

## 3. Voz ElevenLabs
1. elevenlabs.io/voice-library
2. Buscar: "Adriano Narrator", "Cassio Cruz", "Yuri VSL" ou "Lair lairjose"
3. Copiar Voice ID → `.env.local`

## 4. Rodar
```bash
npm run dev
# Abrir http://localhost:3000
```

## 5. Deploy (Vercel)
```bash
npx vercel --prod
```

## Critério de sucesso (Phase 0)
> Edu abre o app, ouve Jarvis dizer "Bom dia, Edu. 3 coisas importantes pra hoje…"
> e SENTE que isso é o futuro.
