# Jarvis — Setup Phase 0

## 1. Criar repositório no GitHub

```bash
# No GitHub: criar repo privado "jarvis" em eadebarros
# Depois:
cd /home/user/jarvis
git remote set-url origin https://github.com/eadebarros/jarvis.git
git add -A
git commit -m "feat: Phase 0 — Prova de Vida"
git push -u origin main
```

## 2. Instalar dependências

```bash
cd /home/user/jarvis
npm install
```

## 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com suas chaves
```

Variáveis obrigatórias para Phase 0:
- `ANTHROPIC_API_KEY` — console.anthropic.com
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` — elevenlabs.io

Variáveis opcionais (degradam graciosamente se ausentes):
- Supabase — memória persiste só em memória sem isso
- Google OAuth2 — Gmail mostra dados mock sem isso

## 4. Supabase (opcional na Phase 0)

Execute `supabase-schema.sql` no SQL Editor do projeto Supabase.
Edite as linhas de seed com informações reais do Edu.

## 5. Google OAuth2 (opcional na Phase 0)

1. Google Cloud Console → criar projeto → ativar Gmail API
2. Criar credenciais OAuth2 (tipo: Web application)
3. Redirect URI: `https://developers.google.com/oauthplayground`
4. No OAuth Playground → configurar com seu Client ID/Secret
5. Selecionar `https://www.googleapis.com/auth/gmail.readonly`
6. Trocar por tokens → copiar `Refresh token` para `.env.local`

## 6. Voz ElevenLabs

1. Acessar elevenlabs.io/voice-library
2. Buscar por um dos candidatos: "Adriano Narrator", "Cassio Cruz", "Yuri VSL", "Lair lairjose"
3. Copiar o Voice ID (URL da voz ou Settings)
4. Adicionar ao `.env.local`

## 7. Rodar localmente

```bash
npm run dev
# Abrir http://localhost:3000
```

## 8. Deploy (Vercel)

```bash
npx vercel --prod
# Configurar env vars no dashboard Vercel
```

## Critério de sucesso (Phase 0)

> Edu abre o app, ouve Jarvis dizer "Bom dia, Edu. 3 coisas importantes pra hoje…"
> e SENTE que isso é o futuro.
