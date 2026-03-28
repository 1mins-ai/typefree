import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DictionaryDialog } from "./components/dictionary/DictionaryDialog";
import { DictionaryView } from "./components/dictionary/DictionaryView";
import { HistoryView } from "./components/history/HistoryView";
import { HomeView } from "./components/home/HomeView";
import { AppSidebar } from "./components/layout/AppSidebar";
import { OverlayShell } from "./components/overlay/OverlayShell";
import { SettingsView } from "./components/settings/SettingsView";
import type { AppView } from "./constants/app";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { useDictionaryManager } from "./hooks/useDictionaryManager";
import { useDictationSession } from "./hooks/useDictationSession";
import { deleteHistoryEntry, isOverlayWindow, loadHistory, loadSettings, saveSettings } from "./lib/tauri";
import type { AppSettings, SessionStatus } from "./types";

function AppShell() {
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState<AppView>("home");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const copyTimerRef = useRef<number | null>(null);
  const openRouterKeyInputRef = useRef<HTMLInputElement | null>(null);
  const googleKeyInputRef = useRef<HTMLInputElement | null>(null);
  const hotkeyHandlerRef = useRef<() => void | Promise<void>>(() => undefined);
  const sessionStatusHandlerRef = useRef<(status: SessionStatus) => void>(() => undefined);

  const {
    settings,
    setSettings,
    history,
    setHistory,
    error,
    setError,
    autostartEnabled,
    autostartLoading,
    handleAutostartToggle,
  } = useAppBootstrap({
    t,
    onHotkeyTriggered: () => hotkeyHandlerRef.current(),
    onSessionStatusChange: (status) => sessionStatusHandlerRef.current(status),
  });

  function clearCopyTimer() {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }

  function clearFeedback() {
    clearCopyTimer();
    setCopyMessage("");
    setSaveMessage("");
  }

  function getCurrentSettings() {
    const nextSettings: AppSettings = { ...settings };
    const openRouterValue = openRouterKeyInputRef.current?.value?.trim();
    const googleValue = googleKeyInputRef.current?.value?.trim();

    if (openRouterValue) {
      nextSettings.openrouterApiKey = openRouterValue;
    }

    if (googleValue) {
      nextSettings.googleApiKey = googleValue;
    }

    return nextSettings;
  }

  const {
    status,
    setStatus,
    micLevel,
    transcript,
    cleanedText,
    handleHotkeyToggle,
  } = useDictationSession({
    t,
    getCurrentSettings,
    setSettings,
    setHistory,
    setError,
    clearFeedback,
  });

  useEffect(() => {
    hotkeyHandlerRef.current = handleHotkeyToggle;
    sessionStatusHandlerRef.current = setStatus;
  }, [handleHotkeyToggle, setStatus]);

  useEffect(() => {
    return () => {
      clearCopyTimer();
    };
  }, []);

  useEffect(() => {
    setError("");
    setSaveMessage("");
    setCopyMessage("");
  }, [i18n.language, setError]);

  const dictionary = useDictionaryManager({
    phraseHints: settings.phraseHints,
    onPhraseHintsChange: (phraseHints) => {
      setSettings((current) => ({ ...current, phraseHints }));
    },
    t,
  });

  function announceCopy(message: string) {
    clearCopyTimer();
    setCopyMessage(message);
    copyTimerRef.current = window.setTimeout(() => {
      setCopyMessage("");
    }, 1800);
  }

  async function persistSettings() {
    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      await saveSettings(getCurrentSettings());
      const [reloadedSettings, refreshedHistory] = await Promise.all([loadSettings(), loadHistory()]);
      setSettings(reloadedSettings);
      setHistory(refreshedHistory);
      setSaveMessage(t("messages.settingsSaved"));
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      announceCopy(t("messages.copiedClipboard"));
    } catch (clipboardError) {
      console.error(clipboardError);
      setError(t("messages.failedCopy"));
    }
  }

  async function handleDelete(entryId: string) {
    try {
      setHistory(await deleteHistoryEntry(entryId));
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        currentLanguage={i18n.resolvedLanguage ?? i18n.language}
        onLanguageChange={(language) => {
          void i18n.changeLanguage(language);
        }}
        availableAnywhereLabel={t("sidebar.availableAnywhere")}
        availableAnywhereCopy={t("sidebar.availableAnywhereCopy", { hotkey: settings.globalHotkey })}
        languageLabel={t("sidebar.interfaceLanguage")}
        renderLabel={t}
      />

      <main className="main-pane">
        {activeView === "home" ? (
          <HomeView
            t={t}
            settings={settings}
            history={history}
            status={status}
            micLevel={micLevel}
            error={error}
            transcript={transcript}
            cleanedText={cleanedText}
            onCopyLatest={handleCopy}
          />
        ) : null}

        {activeView === "history" ? (
          <HistoryView
            t={t}
            settings={settings}
            history={history}
            onCopy={handleCopy}
            onDelete={handleDelete}
          />
        ) : null}

        {activeView === "dictionary" ? (
          <DictionaryView
            t={t}
            dictionaryWords={dictionary.dictionaryWords}
            filteredDictionaryWords={dictionary.filteredDictionaryWords}
            dictionaryQuery={dictionary.dictionaryQuery}
            onDictionaryQueryChange={dictionary.setDictionaryQuery}
            onOpenAddDialog={dictionary.openAddDictionaryDialog}
            onOpenEditDialog={dictionary.openEditDictionaryDialog}
            onRemoveWord={dictionary.removeDictionaryWord}
            onSave={persistSettings}
            saving={saving}
            error={error}
            saveMessage={saveMessage}
          />
        ) : null}

        {activeView === "setting" ? (
          <SettingsView
            t={t}
            settings={settings}
            onSettingsChange={setSettings}
            onSave={persistSettings}
            saving={saving}
            error={error}
            saveMessage={saveMessage}
            autostartEnabled={autostartEnabled}
            autostartLoading={autostartLoading}
            onAutostartToggle={handleAutostartToggle}
            openRouterKeyInputRef={openRouterKeyInputRef}
            googleKeyInputRef={googleKeyInputRef}
          />
        ) : null}

        {copyMessage ? <div className="toast-banner">{copyMessage}</div> : null}
      </main>

      <DictionaryDialog
        t={t}
        open={dictionary.dictionaryDialogOpen}
        mode={dictionary.dictionaryDialogMode}
        draft={dictionary.dictionaryDraft}
        validation={dictionary.dictionaryValidation}
        onDraftChange={dictionary.setDictionaryDraft}
        onClose={dictionary.closeDictionaryDialog}
        onSubmit={dictionary.submitDictionaryWord}
        onClearValidation={() => dictionary.setDictionaryValidation("")}
      />
    </div>
  );
}

export default function App() {
  return isOverlayWindow() ? <OverlayShell /> : <AppShell />;
}
