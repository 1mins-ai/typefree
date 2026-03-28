import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { buildHotkeyFromEvent, formatHotkeyDisplay } from "../../lib/appHelpers";

interface HotkeyRecorderProps {
  value: string;
  onChange: (hotkey: string) => void;
  onClear: () => void;
  recordingLabel: string;
  placeholderLabel: string;
  invalidLabel: string;
  clearLabel: string;
}

export function HotkeyRecorder({
  value,
  onChange,
  onClear,
  recordingLabel,
  placeholderLabel,
  invalidLabel,
  clearLabel,
}: HotkeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const { hotkey, error } = buildHotkeyFromEvent(event);
    if (!hotkey) {
      setValidationMessage(error || invalidLabel);
      return;
    }

    setValidationMessage("");
    onChange(hotkey);
    setRecording(false);
  }, [invalidLabel, onChange]);

  useEffect(() => {
    if (!recording) return;

    containerRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown, true);

    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown, recording]);

  useEffect(() => {
    if (!recording) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setValidationMessage("");
        setRecording(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [recording]);

  function beginRecording() {
    setValidationMessage("");
    setRecording(true);
    requestAnimationFrame(() => {
      containerRef.current?.focus();
    });
  }

  function handleRecorderKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!recording) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        beginRecording();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      setValidationMessage("");
      setRecording(false);
      return;
    }

    const { hotkey, error } = buildHotkeyFromEvent(event);
    if (!hotkey) {
      setValidationMessage(error || invalidLabel);
      return;
    }

    setValidationMessage("");
    onChange(hotkey);
    setRecording(false);
  }

  const parts = value ? formatHotkeyDisplay(value) : [];

  return (
    <div className="hotkey-recorder-wrap">
      <div
        ref={containerRef}
        className={`hotkey-recorder ${recording ? "is-recording" : ""} ${validationMessage ? "is-invalid" : ""}`}
        onClick={beginRecording}
        role="button"
        tabIndex={0}
        onKeyDown={handleRecorderKeyDown}
        onKeyDownCapture={recording ? handleRecorderKeyDown : undefined}
      >
        {recording ? (
          <span className="hotkey-recording-text">{recordingLabel}</span>
        ) : parts.length ? (
          <>
            <span className="hotkey-keys">
              {parts.map((part, index) => (
                <span className="hotkey-key" key={`${part}-${index}`}>{part}</span>
              ))}
            </span>
            <button
              type="button"
              className="hotkey-clear"
              onClick={(event) => {
                event.stopPropagation();
                setValidationMessage("");
                onClear();
              }}
              aria-label={clearLabel}
            >
              {"\u00d7"}
            </button>
          </>
        ) : (
          <span className="hotkey-placeholder">{placeholderLabel}</span>
        )}
      </div>
      {validationMessage ? (
        <p className="hotkey-validation">{validationMessage || invalidLabel}</p>
      ) : null}
    </div>
  );
}
