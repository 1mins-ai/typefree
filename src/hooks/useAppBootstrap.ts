import { useCallback, useEffect, useRef, useState } from "react";
import { disable as disableAutostart, enable as enableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import type { TFunction } from "i18next";
import { defaultSettings } from "../constants/app";
import {
  listenForHotkey,
  listenForSessionStatus,
  loadHistory,
  loadSettings,
} from "../lib/tauri";
import type { AppSettings, HistoryEntry, HotkeyStatePayload, SessionStatus } from "../types";

interface UseAppBootstrapOptions {
  t: TFunction;
  onHotkeyTriggered: (payload: HotkeyStatePayload) => void | Promise<void>;
  onSessionStatusChange: (status: SessionStatus) => void;
}

export function useAppBootstrap({
  t,
  onHotkeyTriggered,
  onSessionStatusChange,
}: UseAppBootstrapOptions) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(true);
  const hotkeyHandlerRef = useRef(onHotkeyTriggered);
  const sessionStatusHandlerRef = useRef(onSessionStatusChange);
  const tRef = useRef(t);

  useEffect(() => {
    hotkeyHandlerRef.current = onHotkeyTriggered;
  }, [onHotkeyTriggered]);

  useEffect(() => {
    sessionStatusHandlerRef.current = onSessionStatusChange;
  }, [onSessionStatusChange]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const reloadAppData = useCallback(async () => {
    const [loadedSettings, loadedHistory] = await Promise.all([loadSettings(), loadHistory()]);
    setSettings(loadedSettings);
    setHistory(loadedHistory);
    setBootstrapped(true);
    return { loadedSettings, loadedHistory };
  }, []);

  useEffect(() => {
    let unlistenHotkey: (() => void) | undefined;
    let unlistenSessionStatus: (() => void) | undefined;

    reloadAppData().catch((loadError) => {
      console.error(loadError);
      setError(tRef.current("messages.failedLoad"));
      setBootstrapped(true);
    });

    listenForHotkey((payload) => {
      void hotkeyHandlerRef.current(payload);
    })
      .then((unlisten) => {
        unlistenHotkey = unlisten;
      })
      .catch((listenError) => {
        console.error(listenError);
        setError(tRef.current("messages.failedHotkey"));
      });
    listenForSessionStatus(({ status }) => {
      sessionStatusHandlerRef.current(status);
    })
      .then((unlisten) => {
        unlistenSessionStatus = unlisten;
      })
      .catch((listenError) => {
        console.error(listenError);
      });

    isAutostartEnabled()
      .then((enabled) => {
        setAutostartEnabled(enabled);
      })
      .catch((autostartError) => {
        console.error(autostartError);
      })
      .finally(() => {
        setAutostartLoading(false);
      });

    return () => {
      unlistenHotkey?.();
      unlistenSessionStatus?.();
    };
  }, [reloadAppData]);

  const handleAutostartToggle = useCallback(async (enabled: boolean) => {
    setAutostartLoading(true);
    setError("");

    try {
      if (enabled) {
        await enableAutostart();
      } else {
        await disableAutostart();
      }

      setAutostartEnabled(await isAutostartEnabled());
    } catch (autostartError) {
      console.error(autostartError);
      setError(autostartError instanceof Error ? autostartError.message : String(autostartError));
    } finally {
      setAutostartLoading(false);
    }
  }, []);

  return {
    settings,
    setSettings,
    history,
    setHistory,
    error,
    setError,
    bootstrapped,
    autostartEnabled,
    autostartLoading,
    handleAutostartToggle,
    reloadAppData,
  };
}
