import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Upload,
  BookOpen,
  Sparkles,
  Loader2,
  Download,
  AlertCircle,
  Clock,
  LogIn,
  LogOut,
  Trash2,
  UserCircle,
  KeyRound,
  Save,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AppLanguage = "ro" | "en";
type ContextMode = "1m" | "1.5m";
type SourceType = "text" | "file" | "media";

type LessonHistoryItem = {
  id: string;
  title: string;
  source_type: SourceType;
  language: AppLanguage;
  transcription: string;
  material: string;
  created_at: string;
};

const CONTEXT_LIMITS: Record<ContextMode, number> = {
  "1m": 1_000_000,
  "1.5m": 1_500_000,
};

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  ro: "Română",
  en: "English",
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function formatRequestError(err: any): string {
  const message = String(err?.message || err || "A apărut o eroare.");
  if (message.toLowerCase() === "failed to fetch") {
    return "Conexiunea cu serverul local a fost întreruptă. Verifică dacă serverul încă rulează și încearcă din nou.";
  }
  return message;
}

function inferLessonTitle(materialText: string, fallback: string): string {
  const heading = materialText
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line.startsWith("#") ||
        /titlul lec/i.test(line) ||
        /lesson title/i.test(line),
    );

  const rawTitle = heading
    ?.replace(/^#+\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/^(titlul lecției|titlul lecÈ›iei|lesson title)\s*:\s*/i, "")
    .trim();

  const candidate =
    rawTitle ||
    fallback
      .split(/\r?\n/)
      .find((line) => line.trim().length > 8)
      ?.trim();
  return (candidate || "Lecție nouă").slice(0, 90);
}

function formatHistoryDate(date: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getAuthRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export default function App() {
  const [transcription, setTranscription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [material, setMaterial] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("ro");
  const [contextMode, setContextMode] = useState<ContextMode>("1.5m");
  const [inputSource, setInputSource] = useState<SourceType>("text");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [history, setHistory] = useState<LessonHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  );
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(false);
  const [isApiKeySaving, setIsApiKeySaving] = useState(false);
  const [apiKeySavedAt, setApiKeySavedAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const contextLimit = CONTEXT_LIMITS[contextMode];
  const estimatedUsage = estimateTokens(`${transcription}\n${material ?? ""}`);
  const contextOverLimit = estimatedUsage > contextLimit;

  const loadHistory = async (activeUser = user) => {
    if (!supabase || !activeUser) {
      setHistory([]);
      return;
    }

    setIsHistoryLoading(true);
    const { data, error: historyError } = await supabase
      .from("lesson_history")
      .select("id,title,source_type,language,transcription,material,created_at")
      .eq("user_id", activeUser.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (historyError) {
      setError(historyError.message);
    } else {
      setHistory((data ?? []) as LessonHistoryItem[]);
    }
    setIsHistoryLoading(false);
  };

  const loadUserSettings = async (activeUser = user) => {
    if (!supabase || !activeUser) {
      setGeminiApiKey("");
      setApiKeySavedAt(null);
      return;
    }

    setIsApiKeyLoading(true);
    const { data, error: settingsError } = await supabase
      .from("user_settings")
      .select("gemini_api_key,updated_at")
      .eq("user_id", activeUser.id)
      .maybeSingle();

    if (settingsError) {
      setError(settingsError.message);
    } else {
      setGeminiApiKey(data?.gemini_api_key ?? "");
      setApiKeySavedAt(data?.updated_at ?? null);
    }
    setIsApiKeyLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const activeUser = data.session?.user ?? null;
      setUser(activeUser);
      setIsAuthLoading(false);
      if (activeUser) {
        void loadHistory(activeUser);
        void loadUserSettings(activeUser);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const activeUser = session?.user ?? null;
        setUser(activeUser);
        setSelectedHistoryId(null);
        if (activeUser) {
          void loadHistory(activeUser);
          void loadUserSettings(activeUser);
        } else {
          setHistory([]);
          setGeminiApiKey("");
          setApiKeySavedAt(null);
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) {
      setError(
        "Supabase nu este configurat. Adaugă VITE_SUPABASE_URL și VITE_SUPABASE_ANON_KEY în .env.",
      );
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });
    if (signInError) setError(signInError.message);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setHistory([]);
    setSelectedHistoryId(null);
    setGeminiApiKey("");
    setApiKeySavedAt(null);
  };

  const saveGeminiApiKey = async () => {
    if (!supabase || !user) {
      setError(
        "Autentifica-te cu Google pentru a salva API key-ul intre sesiuni.",
      );
      return;
    }

    const trimmedApiKey = geminiApiKey.trim();
    if (!trimmedApiKey) {
      setError("Introdu un Gemini API key valid inainte de salvare.");
      return;
    }

    setIsApiKeySaving(true);
    const { data, error: saveError } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          gemini_api_key: trimmedApiKey,
        },
        { onConflict: "user_id" },
      )
      .select("updated_at")
      .single();

    if (saveError) {
      setError(saveError.message);
    } else {
      setGeminiApiKey(trimmedApiKey);
      setApiKeySavedAt(data?.updated_at ?? new Date().toISOString());
      setError(null);
    }
    setIsApiKeySaving(false);
  };

  const saveHistoryItem = async (
    sourceType: SourceType,
    nextTranscription: string,
    nextMaterial: string,
  ) => {
    if (!supabase || !user) return;

    const title = inferLessonTitle(nextMaterial, nextTranscription);
    const { data, error: saveError } = await supabase
      .from("lesson_history")
      .insert({
        user_id: user.id,
        title,
        source_type: sourceType,
        language,
        transcription: nextTranscription,
        material: nextMaterial,
      })
      .select("id,title,source_type,language,transcription,material,created_at")
      .single();

    if (saveError) {
      setError(saveError.message);
      return;
    }

    const item = data as LessonHistoryItem;
    setHistory((current) => [item, ...current].slice(0, 30));
    setSelectedHistoryId(item.id);
  };

  const openHistoryItem = (item: LessonHistoryItem) => {
    setTranscription(item.transcription);
    setMaterial(item.material);
    setLanguage(item.language);
    setError(null);
    setSelectedHistoryId(item.id);
    setInputSource(item.source_type);
  };

  const deleteHistoryItem = async (id: string) => {
    if (!supabase || !user) return;
    const { error: deleteError } = await supabase
      .from("lesson_history")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setHistory((current) => current.filter((item) => item.id !== id));
    if (selectedHistoryId === id) setSelectedHistoryId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/json" || file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputSource("file");
        setSelectedHistoryId(null);
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) {
            const text = json
              .map(
                (item) =>
                  `[${item.speaker || "Necunoscut"}]: ${item.text || ""}`,
              )
              .join("\n");
            setTranscription(text);
          } else {
            setTranscription(JSON.stringify(json, null, 2));
          }
        } catch (err) {
          setTranscription(event.target?.result as string);
        }
      };
      reader.readAsText(file);
    } else {
      // If it's a plain text file
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputSource("file");
        setSelectedHistoryId(null);
        setTranscription(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.warn("No file selected in handleMediaUpload");
      return;
    }

    const fileSize = file.size || 0;
    const fileName = file.name || "fișier necunoscut";

    // Client-side size check (100MB is a safer bet for the proxy limit)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      setError(
        `Fișierul este prea mare (${(fileSize / (1024 * 1024)).toFixed(1)}MB). Limita maximă suportată pentru încărcare este de 100MB. Te rugăm să folosești un fișier mai mic.`,
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMaterial(null);
    setInputSource("media");
    setSelectedHistoryId(null);
    setTranscription(
      `Se încarcă și se analizează fișierul: ${fileName}...\nAcest proces poate dura 1-2 minute.`,
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    formData.append("apiKey", geminiApiKey.trim());

    try {
      const response = await fetch("/api/upload-and-process", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Server neașteptat: ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "A apărut o eroare la procesare.");

      setMaterial(data.result);
      if (data.transcription?.trim()) {
        setTranscription(data.transcription.trim());
        await saveHistoryItem("media", data.transcription.trim(), data.result);
      } else {
        setTranscription(
          language === "en"
            ? `[Transcription unavailable for: ${fileName}]`
            : `[Transcrierea nu a putut fi extrasă din: ${fileName}]`,
        );
      }
    } catch (err: any) {
      setError(formatRequestError(err));
      setTranscription("");
    } finally {
      setIsGenerating(false);
      if (mediaInputRef.current) {
        mediaInputRef.current.value = "";
      }
    }
  };

  const generateMaterial = async () => {
    if (!transcription.trim()) {
      setError(
        language === "en"
          ? "Please enter a transcription or upload a file."
          : "Te rugăm să introduci o transcriere sau să încarci un fișier.",
      );
      return;
    }

    if (contextOverLimit) {
      setError(
        language === "en"
          ? `Content exceeds the selected context window (~${formatTokenCount(estimatedUsage)} / ${formatTokenCount(contextLimit)} tokens). Switch to Extended (1.5M) or shorten the text.`
          : `Conținutul depășește fereastra de context (~${formatTokenCount(estimatedUsage)} / ${formatTokenCount(contextLimit)} tokeni). Alege Extins (1.5M) sau scurtează textul.`,
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMaterial(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription,
          language,
          apiKey: geminiApiKey.trim(),
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Server neașteptat: ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "A apărut o eroare.");

      setMaterial(data.result);
      await saveHistoryItem(inputSource, transcription, data.result);
    } catch (err: any) {
      setError(formatRequestError(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadMarkdown = () => {
    if (!material) return;
    const blob = new Blob([material], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "LearnX_Lectie_Structurata.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-900 bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold">
              LX
            </div>
            <span className="font-bold text-xl tracking-tight uppercase">
              LEARNX
            </span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Bibliotecă
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-orange-50 text-orange-700 rounded-lg font-medium transition-all">
            <BookOpen className="w-5 h-5" />
            Lecții Procesate
          </button>
          <div className="px-2 pt-3">
            {!isSupabaseConfigured && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                Supabase nu este configurat. Adaugă URL-ul și anon key-ul în
                `.env`.
              </div>
            )}

            {isSupabaseConfigured && !user && (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Autentifică-te cu Google pentru istoric de chat-uri și lecții.
                </p>
                <button
                  onClick={signInWithGoogle}
                  disabled={isAuthLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" />
                  Login cu Google
                </button>
              </div>
            )}

            {user && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <UserCircle className="h-5 w-5 shrink-0 text-orange-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {user.user_metadata?.full_name || user.email}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={signOut}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-500"
                    title="Delogare"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between px-1 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Istoric
                  </span>
                  {isHistoryLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                  )}
                </div>

                <div className="max-h-56 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                  {history.length === 0 && (
                    <p className="px-1 py-2 text-[11px] leading-relaxed text-slate-400">
                      Generările salvate vor apărea aici.
                    </p>
                  )}

                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "group flex items-start gap-2 rounded-lg border p-2 transition-colors",
                        selectedHistoryId === item.id
                          ? "border-orange-200 bg-orange-50"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50",
                      )}
                    >
                      <button
                        onClick={() => openHistoryItem(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-xs font-semibold text-slate-700">
                          {item.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatHistoryDate(item.created_at)} ·{" "}
                          {item.source_type}
                        </p>
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="rounded-md p-1 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        title="Șterge din istoric"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="pt-8 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Configurare
          </div>
          <div className="px-4 py-2 flex flex-col gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                <KeyRound className="h-4 w-4 text-orange-500" />
                API key personal
              </div>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  setApiKeySavedAt(null);
                }}
                disabled={isApiKeyLoading}
                placeholder="Gemini API key"
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-mono text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
              />
              <button
                onClick={saveGeminiApiKey}
                disabled={
                  !user ||
                  isApiKeySaving ||
                  isApiKeyLoading ||
                  !geminiApiKey.trim()
                }
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isApiKeySaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salveaza cheia
              </button>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                {user
                  ? apiKeySavedAt
                    ? "Cheia este salvata pentru sesiunile viitoare."
                    : "Cheia introdusa va fi folosita la generare."
                  : "Login necesar pentru salvare in baza de date."}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Gemini API</span>
              <span
                className={cn(
                  "h-2 w-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]",
                  geminiApiKey.trim()
                    ? "bg-green-500 animate-pulse"
                    : "bg-amber-400",
                )}
              ></span>
            </div>
            <div className="text-[10px] bg-slate-100 p-2 rounded font-mono text-slate-400 truncate">
              {geminiApiKey.trim()
                ? "Cheie utilizator activa"
                : "Fallback server .env"}
            </div>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xl shadow-slate-200">
            <p className="text-[10px] font-medium text-slate-400 uppercase mb-1 tracking-widest">
              Model Curent
            </p>
            <p className="text-sm font-bold">Gemini 3 Flash</p>
            <div className="mt-3 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-orange-500"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-hidden">
        {/* Top Control Bar */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center font-bold text-orange-600 border border-orange-100">
              01
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">
                {material ? "Document Generat" : "Sursă Nouă"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {isGenerating
                  ? "Procesare în curs..."
                  : "Transformă transcrierea în materie de studiu"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => mediaInputRef.current?.click()}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 border border-orange-200 bg-orange-50 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Clip MP4/Audio
            </button>
            <input
              type="file"
              ref={mediaInputRef}
              onChange={handleMediaUpload}
              className="hidden"
              accept="video/mp4,audio/*"
            />
            {material && (
              <button
                onClick={downloadMarkdown}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                Exportă .md
              </button>
            )}
            <button
              onClick={generateMaterial}
              disabled={isGenerating || !transcription.trim()}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95",
                isGenerating || !transcription.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200",
              )}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? "Se procesează..." : "Generează Material"}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden p-6 gap-6 flex flex-col md:flex-row">
          {/* Input Panel */}
          <div
            className={cn(
              "flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm transition-all duration-500",
              material ? "hidden md:flex" : "flex",
            )}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Transcriere Brută
                </h3>
                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono border border-slate-200">
                  result.json
                </span>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-orange-600 transition-all border border-transparent hover:border-slate-100"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".json,.txt"
              />
            </div>
            <div className="flex-1 min-h-0 p-6 relative flex flex-col overflow-hidden">
              <textarea
                value={transcription}
                onChange={(e) => {
                  setTranscription(e.target.value);
                  setInputSource("text");
                  setSelectedHistoryId(null);
                }}
                placeholder="Lipește aici textul transcris de la curs sau încarcă un fișier..."
                className="flex-1 min-h-0 w-full p-4 font-mono text-[13px] leading-relaxed text-slate-500 bg-slate-50/30 rounded-xl outline-none border-none resize-none placeholder:text-slate-300 overflow-y-auto custom-scrollbar"
              />
              {!transcription && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12 text-center">
                  <div className="flex flex-col items-center gap-4 max-w-sm">
                    <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8" />
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed italic">
                      "Semnalul din zgomot" începe aici. Încarcă o transcriere
                      WhisperX sau <b>folosește MP4/Audio</b> pentru procesare
                      directă.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Output Panel / Error Panel */}
          <div
            className={cn(
              "flex-1 min-h-0 flex flex-col transition-all duration-500",
              !material && !error
                ? "hidden md:flex bg-slate-50/30 border border-dashed border-slate-200 rounded-2xl"
                : "flex",
            )}
          >
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="m-auto max-w-sm bg-red-50 border border-red-100 p-6 rounded-2xl flex flex-col items-center gap-3 text-center text-red-700 shadow-xl"
                >
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <h4 className="font-bold">Eroare de Procesare</h4>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-xs font-bold uppercase tracking-widest bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg transition-colors"
                  >
                    Închide
                  </button>
                </motion.div>
              )}

              {material && (
                <motion.div
                  key="material"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col flex-1 min-h-0 h-full bg-white border border-slate-200 rounded-2xl shadow-lg ring-1 ring-orange-50/50 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl shrink-0">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">
                      Material Didactic (LEARNX)
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(249,115,22,0.8)]"></span>
                        <span className="text-[9px] text-orange-600 font-bold uppercase tracking-widest">
                          Structură Finalizată
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-8 prose prose-sm max-w-none prose-slate">
                    <div className="markdown-body">
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {material}
                      </Markdown>
                    </div>
                  </div>
                </motion.div>
              )}

              {!material && !error && !isGenerating && (
                <div className="m-auto text-center flex flex-col items-center gap-4 opacity-50 select-none">
                  <div className="w-20 h-20 bg-slate-100 p-5 rounded-3xl rotate-12 border border-slate-200 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-slate-300 -rotate-12" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                      Așteptare Date
                    </p>
                    <p className="text-[10px] text-slate-300 font-medium">
                      Materialul tău va apărea aici după procesare
                    </p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="m-auto flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-orange-50 border-t-orange-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700 animate-pulse">
                      LEARNX procesează lecția...
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
                      Transcriere • Structurare • Avertizări !
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status Bar */}
        <footer className="h-12 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] flex-shrink-0">
          <div className="flex gap-6 items-center flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
              <span className="text-slate-400">Limba</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                className="normal-case tracking-normal text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="ro">Română</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              <span className="text-slate-400">Context</span>
              <select
                value={contextMode}
                onChange={(e) => setContextMode(e.target.value as ContextMode)}
                className="normal-case tracking-normal text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="1m">Standard (1M)</option>
                <option value="1.5m">Extins (1.5M)</option>
              </select>
            </label>
            <span
              className={cn(
                "flex items-center gap-2 normal-case tracking-normal text-[11px]",
                contextOverLimit ? "text-red-500" : "text-slate-500",
              )}
              title="Estimare tokeni (caractere ÷ 4)"
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  contextOverLimit ? "bg-red-400" : "bg-green-400",
                )}
              ></span>
              {formatTokenCount(estimatedUsage)} /{" "}
              {formatTokenCount(contextLimit)} tokeni
            </span>
          </div>
          <div className="text-slate-300 flex items-center gap-4">
            <span>LEARNX Engine v2.1</span>
            <div className="w-px h-3 bg-slate-100" />
            <span>InfoEducație AI</span>
          </div>
        </footer>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `,
        }}
      />
    </div>
  );
}
