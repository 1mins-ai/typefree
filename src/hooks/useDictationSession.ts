import { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import {
  hideOverlay,
  loadSettings,
  processDictation,
  showOverlay,
  updateOverlayState,
} from "../lib/tauri";
import { normalizeLevel, toBase64 } from "../lib/appHelpers";
import type {
  AppSettings,
  DictationResult,
  HistoryEntry,
  HotkeyStatePayload,
  SessionStatus,
} from "../types";

interface UseDictationSessionOptions {
  t: TFunction;
  getCurrentSettings: () => AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  clearFeedback: () => void;
}

const SHORT_PRESS_THRESHOLD_MS = 250;

export function useDictationSession({
  t,
  getCurrentSettings,
  setSettings,
  setHistory,
  setError,
  clearFeedback,
}: UseDictationSessionOptions) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const levelBufferRef = useRef<Uint8Array | null>(null);
  const isRecordingRef = useRef(false);
  const statusRef = useRef<SessionStatus>("idle");
  const overlayHideTimerRef = useRef<number | null>(null);
  const startSoundRef = useRef<HTMLAudioElement | null>(null);
  const stopSoundRef = useRef<HTMLAudioElement | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    startSoundRef.current = new Audio("/sfx/start.mp3");
    startSoundRef.current.preload = "auto";

    stopSoundRef.current = new Audio("/sfx/stop.mp3");
    stopSoundRef.current.preload = "auto";

    return () => {
      startSoundRef.current?.pause();
      stopSoundRef.current?.pause();
      startSoundRef.current = null;
      stopSoundRef.current = null;
    };
  }, []);

  const clearOverlayHideTimer = useCallback(() => {
    if (overlayHideTimerRef.current !== null) {
      window.clearTimeout(overlayHideTimerRef.current);
      overlayHideTimerRef.current = null;
    }
  }, []);

  const playCue = useCallback((audio: HTMLAudioElement | null, label: "start" | "stop") => {
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    void audio.play().catch((playbackError) => {
      console.error(`Failed to play ${label} cue`, playbackError);
    });
  }, []);

  useEffect(() => {
    clearOverlayHideTimer();

    const nextOverlayState = {
      visible: status !== "idle",
      status,
      level: status === "listening" ? micLevel : 0,
      message: status === "idle" ? "" : t(`status.${status}`),
    };

    void updateOverlayState(nextOverlayState);

    if (nextOverlayState.visible) {
      void showOverlay();
    } else {
      void hideOverlay();
    }

    if (status === "done" || status === "error") {
      overlayHideTimerRef.current = window.setTimeout(() => {
        setMicLevel(0);
        setStatus("idle");
      }, status === "error" ? 2300 : 1400);
    }
  }, [clearOverlayHideTimer, micLevel, status, t]);

  const cleanupMedia = useCallback(() => {
    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }

    analyserRef.current = null;
    levelBufferRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    isRecordingRef.current = false;
    recordingStartedAtRef.current = null;
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupMedia();
      clearOverlayHideTimer();
      void hideOverlay();
    };
  }, [cleanupMedia, clearOverlayHideTimer]);

  const beginAudioAnalysis = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    levelBufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize)) as Uint8Array<ArrayBuffer>;

    const pump = () => {
      const activeAnalyser = analyserRef.current;
      const buffer = levelBufferRef.current as Uint8Array<ArrayBuffer> | null;

      if (!activeAnalyser || !buffer || statusRef.current !== "listening") {
        return;
      }

      activeAnalyser.getByteTimeDomainData(buffer);
      const level = normalizeLevel(buffer);
      setMicLevel(level);
      void updateOverlayState({
        visible: true,
        status: "listening",
        level,
        message: t("status.listening"),
      });
      analyserFrameRef.current = window.requestAnimationFrame(pump);
    };

    analyserFrameRef.current = window.requestAnimationFrame(pump);
  }, [t]);

  const applyDictationResult = useCallback((result: DictationResult) => {
    setTranscript(result.transcript);
    setCleanedText(result.cleanedText);
    setHistory((current) => [
      result.historyEntry,
      ...current.filter((entry) => entry.id !== result.historyEntry.id),
    ]);
  }, [setHistory]);

  const startRecording = useCallback(async () => {
    if (
      isRecordingRef.current ||
      statusRef.current === "transcribing" ||
      statusRef.current === "cleaning" ||
      statusRef.current === "inserting"
    ) {
      return;
    }

    clearOverlayHideTimer();
    clearFeedback();
    setError("");
    setTranscript("");
    setCleanedText("");
    setMicLevel(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      beginAudioAnalysis(stream);
      recorder.start();
      isRecordingRef.current = true;
      recordingStartedAtRef.current = Date.now();
      setStatus("listening");
      playCue(startSoundRef.current, "start");

      await updateOverlayState({
        visible: true,
        status: "listening",
        level: 0.12,
        message: t("status.listening"),
      });
      await showOverlay();
    } catch (recordError) {
      console.error(recordError);
      setStatus("error");
      setError(t("messages.micFailed"));
    }
  }, [beginAudioAnalysis, clearFeedback, clearOverlayHideTimer, playCue, setError, t]);

  const blobToBase64 = useCallback(async (blob: Blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return toBase64(bytes);
  }, []);

  const cancelRecording = useCallback(async () => {
    if (!isRecordingRef.current || !mediaRecorderRef.current) {
      return;
    }

    const recorder = mediaRecorderRef.current;
    const stopPromise = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.stop();
    cleanupMedia();
    setStatus("idle");
    await stopPromise;
  }, [cleanupMedia]);

  const stopRecordingAndProcess = useCallback(async () => {
    if (
      !isRecordingRef.current ||
      !mediaRecorderRef.current ||
      statusRef.current !== "listening"
    ) {
      return;
    }

    const recorder = mediaRecorderRef.current;
    const mimeType = recorder.mimeType || "audio/webm";

    const elapsed = recordingStartedAtRef.current === null
      ? SHORT_PRESS_THRESHOLD_MS
      : Date.now() - recordingStartedAtRef.current;

    if (elapsed < SHORT_PRESS_THRESHOLD_MS) {
      await cancelRecording();
      return;
    }

    const stopPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(audioChunksRef.current, { type: mimeType }));
      };
    });

    playCue(stopSoundRef.current, "stop");
    recorder.stop();
    setStatus("transcribing");

    try {
      const audioBlob = await stopPromise;
      cleanupMedia();

      const result = await processDictation({
        audioBase64: await blobToBase64(audioBlob),
        mimeType,
        settings: getCurrentSettings(),
      });

      applyDictationResult(result);
      setSettings(await loadSettings());
      setStatus("done");
    } catch (processError) {
      console.error(processError);
      cleanupMedia();

      try {
        setSettings(await loadSettings());
      } catch (reloadError) {
        console.error(reloadError);
      }

      setStatus("error");
      setError(processError instanceof Error ? processError.message : String(processError));
    }
  }, [applyDictationResult, blobToBase64, cancelRecording, cleanupMedia, getCurrentSettings, playCue, setError, setSettings]);

  const handleHotkeyStateChange = useCallback(async (payload: HotkeyStatePayload) => {
    if (payload.state === "pressed") {
      const currentStatus = statusRef.current;

      if (currentStatus === "idle" || currentStatus === "done" || currentStatus === "error") {
        await startRecording();
      }

      return;
    }

    if (payload.state === "released" && statusRef.current === "listening") {
      await stopRecordingAndProcess();
    }
  }, [startRecording, stopRecordingAndProcess]);

  const cancelCurrentSession = useCallback(async () => {
    if (statusRef.current === "listening") {
      await cancelRecording();
    }
  }, [cancelRecording]);

  const finishCurrentSession = useCallback(async () => {
    if (statusRef.current === "listening") {
      await stopRecordingAndProcess();
    }
  }, [stopRecordingAndProcess]);

  return {
    status,
    setStatus,
    micLevel,
    transcript,
    cleanedText,
    handleHotkeyStateChange,
    cancelCurrentSession,
    finishCurrentSession,
  };
}
