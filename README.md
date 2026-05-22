# LEARNX

LEARNX este o aplicație web care transformă transcrieri brute, fișiere `.txt` / `.json` și fișiere audio/video locale în materiale de studiu structurate cu ajutorul Gemini.

Aplicația este gândită pentru lecții, cursuri și explicații lungi: utilizatorul furnizează sursa, backend-ul generează un document Markdown, iar frontend-ul îl afișează într-un spațiu de lucru curat, cu export `.md` și istoric opțional prin Supabase.

## Ce face aplicația

- primește o transcriere lipită manual în editor;
- importă transcrieri din fișiere `.txt` sau `.json`;
- procesează fișiere audio/video locale, cu limită de 100 MB;
- generează material didactic în română sau engleză;
- păstrează materialul strict bazat pe sursa introdusă;
- marchează separat observațiile de verificare cu `!`, fără să modifice materialul principal;
- exportă rezultatul ca fișier Markdown;
- salvează istoricul lecțiilor pentru utilizatorii autentificați cu Google;
- permite salvarea unui Gemini API key per utilizator, prin Supabase.

## Structura rezultatului generat

Gemini primește o transcriere și produce un document Markdown cu:

1. meta-informațiile lecției;
2. rezumat executiv;
3. schemă ierarhică a lecției;
4. glosar de termeni;
5. întrebări de auto-testare;
6. observații de verificare marcate cu `!`, doar când sunt necesare.

Regula principală este că materialul de bază folosește doar informațiile din transcriere. Dacă modelul observă o posibilă diferență față de cunoștințele generale, o semnalează separat.

## Stack tehnic

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, lucide-react, react-markdown.
- **Backend:** Express rulat din `server.ts`.
- **AI:** Google Gemini prin `@google/genai`.
- **Auth și date:** Supabase Auth, Supabase Database, Row Level Security.
- **Build:** Vite pentru frontend și esbuild pentru server.

## Structura proiectului

```text
.
├── src/
│   ├── App.tsx              # interfața principală și flow-urile utilizatorului
│   ├── main.tsx             # mount React
│   ├── index.css            # stiluri Tailwind și randare Markdown
│   └── supabaseClient.ts    # configurare Supabase
├── supabase/migrations/
│   ├── 001_create_learnx_history.sql
│   └── 002_create_user_settings.sql
├── server.ts                # API Express, Gemini, upload audio/video
├── documentatie/index.html  # documentație HTML statică
├── .env.example             # exemplu configurare locală
└── package.json
```

## API principal

### `GET /api/health`

Verifică dacă serverul local răspunde.

### `POST /api/generate`

Primește o transcriere text și returnează materialul Markdown generat.

Body relevant:

```json
{
  "transcription": "textul lecției",
  "language": "ro",
  "apiKey": "cheie opțională a utilizatorului"
}
```

### `POST /api/upload-and-process`

Primește un fișier audio/video local, îl trimite către Gemini pentru transcriere, apoi generează materialul Markdown.

Body: `multipart/form-data`

- `file`: fișierul încărcat;
- `language`: `ro` sau `en`;
- `apiKey`: cheie opțională a utilizatorului.

## Configurare locală

Ai nevoie de Node.js instalat.

1. Instalează dependențele:

```bash
npm install
```

2. Creează `.env` pornind de la `.env.example`:

```bash
cp .env.example .env
```

Pe Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Completează variabilele necesare:

```env
VITE_SUPABASE_URL="https://..."
VITE_SUPABASE_ANON_KEY="sb_publishable_..."
GEMINI_API_KEY=""
GEMINI_MODEL_CHAIN="gemini-3.5-flash,gemini-2.5-flash,gemini-2.5-flash-lite"
```

`GEMINI_API_KEY` poate rămâne gol dacă utilizatorii se autentifică și își salvează cheia în aplicație. Pentru un fallback global pe server, setează cheia doar în `.env` sau în secretele providerului de hosting.

4. Rulează migrările SQL din `supabase/migrations` în Supabase SQL Editor.

5. Pornește aplicația:

```bash
npm run dev
```

Aplicația rulează implicit la:

```text
http://localhost:3000
```

## Comenzi utile

```bash
npm run dev
npm run lint
npm run build
npm run start
```

- `npm run dev` pornește serverul Express și Vite middleware.
- `npm run lint` rulează verificarea TypeScript fără emitere de fișiere.
- `npm run build` construiește frontend-ul și bundle-ul serverului.
- `npm run start` pornește build-ul de producție din `dist/server.mjs`.

## Supabase

Aplicația folosește două tabele:

- `lesson_history`: istoricul lecțiilor generate, legat de `auth.users`;
- `user_settings`: setări per utilizator, inclusiv cheia Gemini salvată.

Ambele tabele au Row Level Security activat. Politicile permit utilizatorilor să citească, insereze, actualizeze și șteargă doar propriile date.

Pentru login cu Google, configurează în Supabase:

- `Authentication > URL Configuration > Site URL`;
- redirect URL pentru `http://localhost:3000`;
- redirect URL pentru domeniul public de deploy.

În Google Cloud OAuth, redirect URI-ul autorizat trebuie să fie callback-ul Supabase:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

## Environment și GitHub

Nu urca `.env` pe GitHub. Repo-ul are `.gitignore` configurat pentru fișiere `.env*`, cu excepția lui `.env.example`.

Regula practică:

- `.env.example` se poate comite;
- `.env` rămâne local;
- `GEMINI_API_KEY` rămâne secret;
- `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY` sunt configurări publice de browser, dar pot fi suprascrise în hosting.

## Documentație HTML

Documentația vizuală este în:

```text
documentatie/index.html
```

Este un site static, self-contained, care poate fi deschis direct în browser.

## Observații de producție

- Upload-ul local are limită de 100 MB.
- Pentru fișiere mari, procesarea poate dura câteva minute.
- Backend-ul reîncearcă automat erorile Gemini temporare și poate trece prin `GEMINI_MODEL_CHAIN`.
- Cheia Gemini salvată în `user_settings` este funcțională pentru MVP, dar pentru un produs sensibil ar trebui luată în calcul o strategie mai strictă de protecție a secretelor.
