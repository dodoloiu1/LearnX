# LEARNX: Lectii Transformate

LEARNX transforma transcrieri brute sau fisiere audio/video in materiale de studiu structurate. Materialul generat foloseste doar informatiile din transcriere; diferentele fata de informatiile generale ale modelului sunt marcate separat cu `!`.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
<<<<<<< HEAD
2. Set `GEMINI_API_KEY` in `.env` or `.env.local`
3. Run the app:
   `npm run dev`
4. Build and run production:
   `npm run build`
   `npm run start`
=======
2. Create `.env` locally with:
   `VITE_SUPABASE_URL="https://dlehdgvheztziiwurdtl.supabase.co"`
   `VITE_SUPABASE_ANON_KEY="your_supabase_publishable_key"`
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
- The Supabase publishable/anon key is safe to expose in frontend apps, but RLS policies must stay enabled.
- On Vercel/Netlify/Render/etc., add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.
- Do not put a real `GEMINI_API_KEY` in GitHub. Users should add their Gemini key inside the app, or you can configure it privately in the hosting provider.
- If Gemini returns 503/UNAVAILABLE because of high demand, the backend retries and then falls back through `GEMINI_MODEL_CHAIN`.
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
