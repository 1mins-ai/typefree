import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type {
  AppSettings,
  DictationResult,
  HistoryEntry,
  HotkeyStatePayload,
  OverlayState,
  SessionStatusPayload,
} from "../types";

interface TauriCommandError {
  message?: string;
  error?: string;
  cause?: string;
}

function normalizeInvokeError(error: unknown) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const candidate = error as TauriCommandError;
    if (candidate.message?.trim()) {
      return candidate.message;
    }
    if (candidate.error?.trim()) {
      return candidate.error;
    }
    if (candidate.cause?.trim()) {
      return candidate.cause;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unexpected Tauri command error.";
}

async function runCommand<T>(command: string, payload?: Record<string, unknown>) {
  try {
    return await invoke<T>(command, payload);
  } catch (error) {
    throw new Error(normalizeInvokeError(error));
  }
}

export async function loadSettings() {
  return runCommand<AppSettings>("load_settings");
}

export async function saveSettings(settings: AppSettings) {
  return runCommand<AppSettings>("save_settings", { settings });
}

export async function loadHistory() {
  return runCommand<HistoryEntry[]>("load_history");
}

export async function deleteHistoryEntry(entryId: string) {
  return runCommand<HistoryEntry[]>("delete_history_entry", { entryId });
}

export async function processDictation(payload: {
  audioBase64: string;
  mimeType: string;
  settings: AppSettings;
}) {
  return runCommand<DictationResult>("process_dictation", payload);
}

export async function getOverlayState() {
  return runCommand<OverlayState>("get_overlay_state");
}

export async function updateOverlayState(overlayState: OverlayState) {
  return runCommand<void>("update_overlay_state", { overlayState });
}

export async function showOverlay() {
  return runCommand<void>("show_overlay");
}

export async function hideOverlay() {
  return runCommand<void>("hide_overlay");
}

export async function listenForHotkey(
  callback: (payload: HotkeyStatePayload) => void,
) {
  return listen<HotkeyStatePayload>("dictation-hotkey-state", (event) =>
    callback(event.payload),
  );
}

export async function listenForSessionStatus(
  callback: (payload: SessionStatusPayload) => void,
) {
  return listen<SessionStatusPayload>("dictation-session-status", (event) =>
    callback(event.payload),
  );
}

export async function listenForOverlayState(
  callback: (payload: OverlayState) => void,
) {
  return listen<OverlayState>("overlay-state", (event) => callback(event.payload));
}

export function isOverlayWindow() {
  return getCurrentWindow().label === "overlay";
}
