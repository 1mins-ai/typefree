export type SessionStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "cleaning"
  | "inserting"
  | "done"
  | "error";

export type LlmProvider = "openrouter" | "ollama";
export type SpeechProvider = "google";
export type HistoryRetention = "day" | "week" | "month" | "forever";

export interface AppSettings {
  speechProvider: SpeechProvider;
  llmProvider: LlmProvider;
  openrouterApiKey: string;
  openrouterModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  googleApiKey: string;
  phraseHints: string;
  sourceLanguage: string;
  globalHotkey: string;
  cleanupEnabled: boolean;
  historyRetention: HistoryRetention;
  hasCompletedOnboarding: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  rawTranscript: string;
  cleanedText: string;
}

export interface DictationResult {
  transcript: string;
  cleanedText: string;
  insertedText: string;
  historyEntry: HistoryEntry;
}

export interface HotkeyStatePayload {
  state: "triggered";
  shortcut: string;
}

export interface SessionStatusPayload {
  status: Exclude<SessionStatus, "idle" | "done" | "error">;
}

export interface OverlayState {
  visible: boolean;
  status: SessionStatus;
  level: number;
  message: string;
}
