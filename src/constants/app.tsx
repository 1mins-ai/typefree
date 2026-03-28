import type { ReactNode } from "react";
import type {
  AppSettings,
  HistoryRetention,
  LlmProvider,
  OverlayState,
  SpeechProvider,
} from "../types";

export type AppView = "home" | "history" | "dictionary" | "setting";
export type UiLanguage = "zh-TW" | "en" | "ja" | "ko";

export const defaultSettings: AppSettings = {
  speechProvider: "google",
  llmProvider: "openrouter",
  openrouterApiKey: "",
  openrouterModel: "openai/gpt-4o-mini",
  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  googleApiKey: "",
  phraseHints: "",
  sourceLanguage: "yue-Hant-HK",
  globalHotkey: "CommandOrControl+Shift+D",
  cleanupEnabled: true,
  historyRetention: "forever",
};

export const defaultOverlayState: OverlayState = {
  visible: false,
  status: "idle",
  level: 0,
  message: "",
};

export const languageOptions = [
  { value: "yue-Hant-HK", labelKey: "options.lang_yue" },
  { value: "cmn-Hans-CN", labelKey: "options.lang_cmn_hans" },
  { value: "cmn-Hant-TW", labelKey: "options.lang_cmn_hant" },
  { value: "en-US", labelKey: "options.lang_en_us" },
  { value: "en-GB", labelKey: "options.lang_en_gb" },
];

export const llmProviderOptions: Array<{ value: LlmProvider; labelKey: string }> = [
  { value: "openrouter", labelKey: "options.provider_openrouter" },
  { value: "ollama", labelKey: "options.provider_ollama" },
];

export const speechProviderOptions: Array<{ value: SpeechProvider; labelKey: string }> = [
  { value: "google", labelKey: "options.speech_provider_google" },
];

export const historyRetentionOptions: Array<{ value: HistoryRetention; labelKey: string }> = [
  { value: "day", labelKey: "options.retention_day" },
  { value: "week", labelKey: "options.retention_week" },
  { value: "month", labelKey: "options.retention_month" },
  { value: "forever", labelKey: "options.retention_forever" },
];

export const sidebarLanguageOptions: Array<{ value: UiLanguage; label: string }> = [
  { value: "zh-TW", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

export const sidebarNavItems: Array<{ id: AppView; labelKey: string; icon: ReactNode }> = [
  {
    id: "home",
    labelKey: "nav.home",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6.5 9.5V20h11V9.5" />
      </svg>
    ),
  },
  {
    id: "history",
    labelKey: "nav.history",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 7v5l3 2" />
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      </svg>
    ),
  },
  {
    id: "dictionary",
    labelKey: "nav.dictionary",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5.5A2.5 2.5 0 0 1 8.5 3H20v16H8.5A2.5 2.5 0 0 0 6 21Z" />
        <path d="M6 5.5V21" />
        <path d="M10 7h6" />
        <path d="M10 11h6" />
      </svg>
    ),
  },
  {
    id: "setting",
    labelKey: "nav.setting",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.8v2.1M12 19.1v2.1M21.2 12h-2.1M4.9 12H2.8M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5" />
      </svg>
    ),
  },
];
