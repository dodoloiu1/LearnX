# LEARNX: Lectii Transformate

LEARNX transforma transcrieri brute sau fisiere audio/video in materiale de studiu structurate. Materialul generat foloseste doar informatiile din transcriere; diferentele fata de informatiile generale ale modelului sunt marcate separat cu `!`.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Optional: create `.env` locally if you want to override the checked-in public Supabase config or set a private server Gemini fallback:
   `VITE_SUPABASE_URL="https://dlehdgvheztziiwurdtl.supabase.co"`
   `VITE_SUPABASE_ANON_KEY="sb_publishable_..."`
   `GEMINI_API_KEY=""`
   `GEMINI_MODEL_CHAIN="gemini-3.5-flash,gemini-2.5-flash,gemini-2.5-flash-lite"`
3. `GEMINI_API_KEY` is optional if users save their own Gemini API key after Google login.
4. Run the SQL migrations from `supabase/migrations` in the Supabase SQL editor.
5. Run the app:
   `npm run dev`
6. Build and run production:
   `npm run build`
   `npm run start`

## GitHub / Deploy

- Do not commit `.env`; it is ignored by `.gitignore`.
- The Supabase publishable/anon key is public browser config. The app includes it as a fallback in `src/supabaseClient.ts` so login works from GitHub builds too.
- Keep RLS policies enabled in Supabase. The browser key must never bypass row-level security.
- On Vercel/Netlify/Render/etc., you may still add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables if you want to override the fallback.
- Do not put a real `GEMINI_API_KEY` in GitHub. Users should add their Gemini key inside the app, or you can configure it privately in the hosting provider.
- If Gemini returns 503/UNAVAILABLE because of high demand, the backend retries and then falls back through `GEMINI_MODEL_CHAIN`.
