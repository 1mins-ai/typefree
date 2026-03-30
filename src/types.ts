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
export type PromptMappingKind = "default" | "custom";
export type PromptMappingMode = "dictation" | "ask_command";

export interface PromptMapping {
  id: string;
  label: string;
  hotkey: string;
  prompt: string;
  kind: PromptMappingKind;
  mode: PromptMappingMode;
}

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
  promptMappings: PromptMapping[];
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
  state: "pressed" | "released";
  shortcut: string;
  mappingId: string;
  mappingKind: PromptMappingKind;
  mappingMode: PromptMappingMode;
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

export interface OverlayActionPayload {
  action: "cancel" | "submit";
}
