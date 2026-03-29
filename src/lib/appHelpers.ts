import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { TFunction } from "i18next";
import { defaultPromptMapping, historyRetentionOptions, languageOptions, speechProviderOptions } from "../constants/app";
import type { AppSettings, HistoryEntry, PromptMapping, SessionStatus } from "../types";

export function toBase64(bytes: ArrayLike<number>) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes).slice(index, index + chunkSize));
  }

  return btoa(binary);
}

export function buildOverlayMessage(status: SessionStatus, error: string, t: TFunction) {
  if (status === "error") return error || t("messages.somethingWrong");
  if (status === "idle") return "";
  return t(`status.${status}`);
}

export function normalizeLevel(samples: ArrayLike<number>) {
  let sumSquares = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const centered = (samples[index] - 128) / 128;
    sumSquares += centered * centered;
  }

  const rms = Math.sqrt(sumSquares / samples.length);
  return Math.min(1, Math.max(0, rms * 6));
}

export function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatDayLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function statusText(status: SessionStatus, t: TFunction) {
  if (status === "idle") return "";
  return t(`status.${status}`);
}

export function providerSummary(settings: AppSettings, t: TFunction) {
  return settings.llmProvider === "openrouter"
    ? settings.openrouterModel || t("messages.openrouterNotSet")
    : settings.ollamaModel || t("messages.ollamaNotSet");
}

export function speechProviderSummary(settings: AppSettings, t: TFunction) {
  return t(
    speechProviderOptions.find((option) => option.value === settings.speechProvider)?.labelKey ??
      "options.speech_provider_google",
  );
}

export function parsePhraseHints(input: string) {
  return input
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function serializePhraseHints(words: string[]) {
  return words.join("\n");
}

export function createCustomPromptMapping(): PromptMapping {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `custom-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`,
    label: "",
    hotkey: "",
    prompt: "",
    kind: "custom",
  };
}

export function normalizePromptMappings(settings: AppSettings) {
  const existingDefault = settings.promptMappings.find((mapping) => mapping.kind === "default");
  const defaultHotkey = existingDefault?.hotkey.trim() || settings.globalHotkey.trim() || defaultPromptMapping.hotkey;

  return [
    {
      id: existingDefault?.id || defaultPromptMapping.id,
      label: existingDefault?.label ?? defaultPromptMapping.label,
      hotkey: defaultHotkey,
      prompt: existingDefault?.prompt || "",
      kind: "default" as const,
    },
    ...settings.promptMappings
      .filter((mapping) => mapping.kind === "custom")
      .map((mapping, index) => ({
        id: mapping.id || `custom-${index + 1}`,
        label: mapping.label ?? "",
        hotkey: mapping.hotkey,
        prompt: mapping.prompt,
        kind: "custom" as const,
      })),
  ];
}

export function validatePromptMappings(settings: AppSettings, t: TFunction) {
  const mappings = normalizePromptMappings(settings);
  const used = new Set<string>();

  for (const mapping of mappings) {
    const label = mapping.label.trim();
    const hotkey = mapping.hotkey.trim();

    if (!label) {
      return t("promptPage.validation.labelRequired");
    }

    if (!hotkey) {
      return mapping.kind === "default"
        ? t("promptPage.validation.defaultHotkeyRequired")
        : t("promptPage.validation.hotkeyRequired");
    }

    const normalizedHotkey = hotkey.toLowerCase();
    if (used.has(normalizedHotkey)) {
      return t("promptPage.validation.duplicateHotkey", { hotkey });
    }
    used.add(normalizedHotkey);

    if (mapping.kind === "custom" && !mapping.prompt.trim()) {
      return t("promptPage.validation.promptRequired");
    }
  }

  return "";
}

export function keyToTauriToken(key: string, code: string) {
  const modifierMap: Record<string, string> = {
    Control: "CommandOrControl",
    Meta: "CommandOrControl",
    Alt: "Alt",
    Shift: "Shift",
  };

  if (modifierMap[key]) return modifierMap[key];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num${code.slice(6)}`;
  if (code.startsWith("Arrow")) return code.slice(5);

  const specialMap: Record<string, string> = {
    Space: "Space",
    Backspace: "Backspace",
    Tab: "Tab",
    Enter: "Return",
    Escape: "Escape",
    Delete: "Delete",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    Insert: "Insert",
    CapsLock: "CapsLock",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Minus: "-",
    Equal: "=",
    Backquote: "`",
  };

  if (specialMap[code]) return specialMap[code];

  for (let index = 1; index <= 24; index += 1) {
    if (code === `F${index}`) return `F${index}`;
  }

  return key.length === 1 ? key.toUpperCase() : key;
}

export function formatHotkeyDisplay(hotkey: string) {
  return hotkey.split("+").map((part) => {
    if (part === "CommandOrControl") return navigator.platform.includes("Mac") ? "\u2318" : "Ctrl";
    if (part === "Shift") return navigator.platform.includes("Mac") ? "\u21e7" : "Shift";
    if (part === "Alt") return navigator.platform.includes("Mac") ? "\u2325" : "Alt";
    return part;
  });
}

export function buildHotkeyFromEvent(event: KeyboardEvent | ReactKeyboardEvent) {
  const modifiers: string[] = [];

  if (event.ctrlKey || event.metaKey) modifiers.push("CommandOrControl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");

  const token = keyToTauriToken(event.key, event.code);
  if (!token) {
    return { hotkey: "", error: "This key cannot be used as a shortcut." };
  }

  if (["CommandOrControl", "Alt", "Shift"].includes(token)) {
    return { hotkey: "", error: "Add another key to complete the shortcut." };
  }

  return {
    hotkey: [...new Set([...modifiers, token])].join("+"),
    error: "",
  };
}

export function countWords(input: string) {
  return input.trim() ? input.trim().split(/\s+/).length : 0;
}

export function groupHistoryEntries(history: HistoryEntry[]) {
  const grouped = new Map<string, HistoryEntry[]>();

  history.forEach((entry) => {
    const label = formatDayLabel(entry.timestamp);
    const existing = grouped.get(label) ?? [];
    existing.push(entry);
    grouped.set(label, existing);
  });

  return Array.from(grouped.entries());
}

export function getSourceLanguageLabel(settings: AppSettings, t: TFunction) {
  return t(languageOptions.find((option) => option.value === settings.sourceLanguage)?.labelKey ?? settings.sourceLanguage);
}

export function getHistoryRetentionLabel(settings: AppSettings, t: TFunction) {
  return t(
    historyRetentionOptions.find((option) => option.value === settings.historyRetention)?.labelKey ??
      "options.retention_forever",
  );
}
