import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, createPartFromUri, FileState } from "@google/genai/node";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";

const projectRoot = process.cwd();

function loadEnvFiles() {
  dotenv.config({ path: path.join(projectRoot, ".env") });
  dotenv.config({ path: path.join(projectRoot, ".env.local"), override: true });
}

loadEnvFiles();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HMR_PORT = Number(process.env.VITE_HMR_PORT) || 24679;

// Setup multer for temporary file storage (păstrează extensia pentru MIME)
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// Configure Express
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

<<<<<<< HEAD
let ai: any = null;

function getGeminiApiKey(): string {
=======
function getGeminiApiKey(apiKeyOverride?: unknown): string {
  const providedApiKey = typeof apiKeyOverride === "string" ? apiKeyOverride.trim() : "";
  if (providedApiKey) {
    return providedApiKey;
  }

>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
  // Vite HMR poate reîncărca frontend-ul fără să repornească Express — re-citim .env la nevoie
  if (!process.env.GEMINI_API_KEY?.trim()) {
    loadEnvFiles();
  }
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.error("GEMINI_API_KEY missing — verifică fișierul .env din rădăcina proiectului");
    throw new Error(
      "GEMINI_API_KEY lipsește. Pune cheia în fișierul .env (nu doar în .env.example) și repornește cu Ctrl+C apoi npm run dev."
    );
  }
  return apiKey;
}

<<<<<<< HEAD
function getAI() {
  if (!ai) {
    const apiKey = getGeminiApiKey();
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
=======
function getAI(apiKeyOverride?: unknown) {
  const apiKey = getGeminiApiKey(apiKeyOverride);
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
}

// Health check / Test endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is reachable" });
});

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Global request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

type AppLanguage = "ro" | "en";

<<<<<<< HEAD
const MODEL_ID = "gemini-3-flash-preview";
=======
const DEFAULT_GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

function getGeminiModelChain(): string[] {
  const configured = process.env.GEMINI_MODEL_CHAIN
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  const models = configured?.length ? configured : DEFAULT_GEMINI_MODELS;
  return [...new Set(models)];
}
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)

function normalizeLanguage(lang: unknown): AppLanguage {
  return lang === "en" ? "en" : "ro";
}

function buildTranscriptionPrompt(language: AppLanguage): string {
  if (language === "en") {
    return `Transcribe the entire audio/video content verbatim.
Include speaker labels when multiple voices are clear (e.g. [Teacher]: ...).
Do not summarize. Output only the raw transcription as plain text.
Use English unless the speech is clearly in another language.`;
  }
  return `Transcrie integral conținutul audio/video, cuvânt cu cuvânt.
Folosește etichete de vorbitor când sunt clare mai multe voci (ex: [Profesor]: ...).
Nu rezuma. Returnează DOAR transcrierea brută, ca text simplu.
Folosește limba română cu diacritice corecte, dacă discursul este în română.`;
}

function buildSystemPrompt(language: AppLanguage): string {
  if (language === "en") {
    return `You are an expert university professor and instructional designer. Transform a raw lesson transcription into useful study material.

Use ONLY the information present in the transcription when writing the study material. Do not correct, replace, invent, complete, or expand the lesson content with outside knowledge.

Technical terms may stay in English when standard in the field; explain them in the glossary.

Generate a complex Markdown document with this STRICT structure:

🎯 1. LESSON META
- Lesson Title, Subject/Domain, 3 learning objectives

📝 2. EXECUTIVE SUMMARY (2-3 dense paragraphs)

🗺️ 3. LESSON SCHEMA (hierarchical I, II, III -> A, B, C -> 1, 2, 3)

🔑 4. GLOSSARY (Term = definition)

🧠 5. SELF-TEST (4-5 questions with brief hints in parentheses)

! 6. VERIFICATION NOTES
- Include this section only if your general knowledge suggests that a statement in the transcription may be wrong, incomplete, outdated, or different from accepted information.
- Start every note with "!". Clearly state that the main material kept the transcription unchanged.
- Do not modify the main material based on these notes.

Ignore greetings, admin chatter, irrelevant jokes only when they are not lesson content. Write clearly in English with proper Markdown.`;
  }

  return `Acționezi ca un profesor universitar expert și specialist în design educațional. Transformă o transcriere brută într-un material de studiu clar pentru un elev.

FOARTE IMPORTANT:
- Folosește DOAR informațiile prezente în transcriere pentru materialul de studiu.
- Nu corecta, nu înlocui, nu inventa, nu completa și nu extinde conținutul lecției cu informații externe.
- Dacă profesorul spune ceva posibil greșit sau incomplet, păstrează în material ideea așa cum apare în transcriere.
- Poți semnala diferențe față de cunoștințele tale generale doar într-o secțiune separată de avertizări, marcată cu "!". Aceste avertizări nu trebuie să modifice materialul principal.

NOTĂ IMPORTANTĂ: Lecția poate fi în limba română dar poate conține termeni tehnici în engleză, mai ales în IT. Păstrează termenii tehnici așa cum apar în transcriere și explică-i în glosar doar pe baza contextului oferit.

SARCINA TA: Analizează transcrierea furnizată și generează un document Markdown complex, respectând STRICT următoarea structură:

🎯 1. META-INFORMAȚIILE LECȚIEI
- Titlul Lecției: dedus strict din transcriere.
- Materia / Domeniul: dedus strict din transcriere.
- Obiectivele principale: 3 bullet-points bazate strict pe conținutul transcrierii.

📝 2. REZUMATUL EXECUTIV (Esența)
- Scrie un rezumat de 2-3 paragrafe dense, clare și concise care să explice firul narativ și ideea principală a întregii lecții. Dacă cineva citește doar acest rezumat, trebuie să înțeleagă despre ce s-a discutat.

🗺️ 3. SCHEMA LECTIEI (Mind-Map Liniar)
- Aceasta este secțiunea principală. Organizează toată informația sub formă de arbore ierarhic, folosind numerotare clară (I, II, III -> A, B, C -> 1, 2, 3).
- Nu omite detalii importante, formule, ani sau nume. Include-le în structura logică.
- Poți reordona ideile pentru claritate, dar fără să adaugi informații noi.
- Folosește bold pentru conceptele importante.

🔑 4. GLOSAR DE TERMENI (Concepte Cheie)
- Extrage doar termeni menționați în transcriere.
- Format: Termen = explicație bazată pe contextul din transcriere.

🧠 5. TEST DE VERIFICARE (Active Recall)
- Formulează 4-5 întrebări esențiale din materie pe care elevul să le folosească pentru auto-testare.
- (Oferă și un mic indiciu sau răspunsul pe scurt în paranteză pentru fiecare).

! 6. OBSERVAȚII DE VERIFICARE
- Include această secțiune doar dacă observi că o afirmație din transcriere pare diferită față de informațiile tale generale.
- Fiecare observație începe cu "!". Exemplu: "! În transcriere apare X; conform informațiilor generale, acest punct poate diferi. Materialul principal a păstrat însă transcrierea."
- Nu transforma observațiile în corecturi ale materialului principal.

REGULI STRICTE DE EXECUȚIE:
- Ignoră saluturile, discuțiile administrative, glumele irelevante sau întreruperile doar dacă nu conțin informație de lecție.
- Dacă materialul este confuz într-un punct, marchează confuzia ca atare; nu o completa din cunoștințe generale.
- Scrie la un nivel academic, dar extrem de clar, folosind diacritice corecte în limba română. Formatează totul impecabil folosind Markdown.`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

<<<<<<< HEAD
function isRetryableGeminiError(error: any): boolean {
  const message = String(error?.message || error || "").toLowerCase();
  const status = Number(error?.status || error?.code || 0);
=======
function getGeminiErrorInfo(error: any) {
  const nested = error?.error ?? {};
  const message = String(error?.message || nested?.message || error || "").toLowerCase();
  const statusText = String(error?.status || nested?.status || "").toUpperCase();
  const code = Number(error?.code || error?.status || nested?.code || 0);
  return { message, statusText, code };
}

function isRetryableGeminiError(error: any): boolean {
  const { message, code, statusText } = getGeminiErrorInfo(error);
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
  return (
    message.includes("fetch failed") ||
    message.includes("socket") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
<<<<<<< HEAD
    status === 408 ||
    status === 429 ||
    status >= 500
=======
    statusText === "UNAVAILABLE" ||
    code === 408 ||
    code === 429 ||
    code >= 500
  );
}

function isGeminiCapacityError(error: any): boolean {
  const { message, code, statusText } = getGeminiErrorInfo(error);
  return (
    code === 503 ||
    statusText === "UNAVAILABLE" ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("temporarily unavailable")
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
  );
}

async function withGeminiRetry<T>(label: string, action: () => Promise<T>): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await action();
    } catch (error: any) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === 3) break;
<<<<<<< HEAD
      const waitMs = attempt * 2500;
=======
      const waitMs = attempt * 2500 + Math.round(Math.random() * 1000);
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
      console.warn(`${label} failed on attempt ${attempt}; retrying in ${waitMs}ms:`, error?.message || error);
      await sleep(waitMs);
    }
  }

  const message = String(lastError?.message || lastError || "Unknown Gemini error");
  if (message.toLowerCase().includes("fetch failed")) {
    throw new Error(
      "Conexiunea către Gemini a picat în timpul procesării. Încearcă din nou; dacă fișierul este mare, comprimă audio/video sau folosește o transcriere text."
    );
  }
  throw lastError;
}

<<<<<<< HEAD
=======
async function withGeminiModelFallback<T>(
  label: string,
  action: (model: string) => Promise<T>
): Promise<T> {
  const models = getGeminiModelChain();
  let lastError: any;

  for (const [index, model] of models.entries()) {
    try {
      return await withGeminiRetry(`${label} (${model})`, () => action(model));
    } catch (error: any) {
      lastError = error;
      const canFallback = isGeminiCapacityError(error) && index < models.length - 1;
      if (!canFallback) break;
      console.warn(`${label}: ${model} is temporarily unavailable; falling back to ${models[index + 1]}.`);
    }
  }

  if (isGeminiCapacityError(lastError)) {
    throw new Error(
      "Modelul Gemini este temporar suprasolicitat. Am incercat automat modelele fallback, dar toate sunt indisponibile momentan. Incearca din nou in cateva minute sau seteaza GEMINI_MODEL_CHAIN cu alte modele disponibile."
    );
  }

  throw lastError;
}

>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
async function generateMaterialFromTranscription(
  client: ReturnType<typeof getAI>,
  transcription: string,
  language: AppLanguage
) {
  const intro =
    language === "en"
      ? `Here is the transcription:\n${transcription}`
      : `Iată transcrierea:\n${transcription}`;

<<<<<<< HEAD
  const response: any = await withGeminiRetry("Material generation", () =>
    client.models.generateContent({
      model: MODEL_ID,
=======
  const response: any = await withGeminiModelFallback("Material generation", (model) =>
    client.models.generateContent({
      model,
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
      contents: [{ text: buildSystemPrompt(language) }, { text: intro }],
    })
  );

  return response.text ?? "";
}

// Existing text-based generation
app.post("/api/generate", async (req, res) => {
  try {
<<<<<<< HEAD
    const { transcription, language: rawLang } = req.body;
=======
    const { transcription, language: rawLang, apiKey } = req.body;
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
    const language = normalizeLanguage(rawLang);
    console.log("Generating material for transcription text length:", transcription?.length);
    if (!transcription) {
      return res.status(400).json({ error: "Transcription is required" });
    }

<<<<<<< HEAD
    const client = getAI();
=======
    const client = getAI(apiKey);
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
    const result = await generateMaterialFromTranscription(client, transcription, language);

    res.json({ result });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate material" });
  }
});

// New video/audio-based generation
app.post("/api/upload-and-process", upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;
  console.log("Received upload request:", req.file?.originalname, "Type:", req.file?.mimetype);
  
  if (!filePath) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
<<<<<<< HEAD
    const client = getAI();
=======
    const client = getAI(req.body?.apiKey);
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)

    const mimeType = req.file?.mimetype || "application/octet-stream";
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error("Fișierul încărcat nu a fost găsit pe disc.");
    }

    const fileBytes = fs.readFileSync(absolutePath);
    const uploadPayload = new Blob([fileBytes], { type: mimeType });

    console.log(
      `Uploading file to Gemini: ${req.file?.originalname} (${(fileBytes.length / 1024).toFixed(1)} KB)`
    );
    let file: any = await withGeminiRetry("Gemini file upload", () =>
      client.files.upload({
        file: uploadPayload,
        config: {
          mimeType,
          displayName: req.file?.originalname,
        },
      })
    );

    if (!file.name) {
      throw new Error("Upload-ul către Gemini nu a returnat un fișier valid.");
    }

    let attempts = 0;
    while (file.state === FileState.PROCESSING && attempts < 60) {
      console.log(`Processing file state: ${file.state} (attempt ${attempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      file = await withGeminiRetry("Gemini file status", () => client.files.get({ name: file.name }));
      attempts++;
    }

    if (file.state === FileState.FAILED) {
      throw new Error("File processing failed in Gemini. Verifică formatul fișierului.");
    }

    if (file.state !== FileState.ACTIVE || !file.uri) {
      throw new Error(
        attempts >= 60
          ? "File processing timed out in Gemini."
          : "Fișierul nu este încă gata pentru analiză."
      );
    }

    const language = normalizeLanguage(req.body?.language);

    console.log("File is ready. Transcribing audio...");
<<<<<<< HEAD
    const transcribeResponse: any = await withGeminiRetry("Media transcription", () =>
      client.models.generateContent({
        model: MODEL_ID,
=======
    const transcribeResponse: any = await withGeminiModelFallback("Media transcription", (model) =>
      client.models.generateContent({
        model,
>>>>>>> 7e46872 (API KEY IMPLEMENTAT + FALLBACK DACA DA EROARE GEMINI)
        contents: [
          buildTranscriptionPrompt(language),
          createPartFromUri(file.uri, file.mimeType || mimeType),
        ],
      })
    );
    const transcription = (transcribeResponse.text ?? "").trim();
    if (!transcription) {
      throw new Error("Nu s-a putut obține transcrierea din fișierul audio/video.");
    }

    console.log("Transcription length:", transcription.length, "— generating material...");
    const result = await generateMaterialFromTranscription(client, transcription, language);

    // Clean up
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch(e) {}
    }
    
    res.json({ result, transcription });
  } catch (error: any) {
    console.error("Upload/Process Error:", error?.stack || error);
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch(e) {}
    }
    res.status(500).json({ error: error.message || "Failed to process video/audio" });
  }
});

// Final error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Express Error Handler:", err);
  res.status(500).json({ error: err.message || "Unexpected server error" });
});


async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: HMR_PORT },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const keyOk = Boolean(process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(keyOk ? "GEMINI_API_KEY: încărcată din .env" : "GEMINI_API_KEY: LIPSEȘTE — adaugă cheia în .env și repornește serverul");
  });
}

startServer();
