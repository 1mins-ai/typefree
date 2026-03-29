import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { defaultOverlayState } from "../../constants/app";
import { emitOverlayAction, getOverlayState, listenForOverlayState } from "../../lib/tauri";
import type { OverlayState } from "../../types";

export function OverlayShell() {
  const { t } = useTranslation();
  const [overlayState, setOverlayState] = useState<OverlayState>(defaultOverlayState);
  const isProcessing =
    overlayState.status === "transcribing" ||
    overlayState.status === "cleaning" ||
    overlayState.status === "inserting";

  useEffect(() => {
    document.body.classList.add("overlay-window");
    document.documentElement.classList.add("overlay-window");

    const currentWindow = getCurrentWindow();
    void currentWindow.setAlwaysOnTop(true);
    void currentWindow.setFocusable(false);
    void currentWindow.setIgnoreCursorEvents(false);

    getOverlayState()
      .then((state) => {
        setOverlayState(state);
      })
      .catch((overlayError) => {
        console.error(overlayError);
      });

    let unlisten: (() => void) | undefined;

    listenForOverlayState((payload) => {
      setOverlayState(payload);
    })
      .then((dispose) => {
        unlisten = dispose;
      })
      .catch((listenError) => {
        console.error(listenError);
      });

    return () => {
      document.body.classList.remove("overlay-window");
      document.documentElement.classList.remove("overlay-window");
      unlisten?.();
    };
  }, []);

  const bars = Array.from({ length: 13 }, (_, index) => {
    const baseScale = 0.22 + overlayState.level * (0.35 + (index % 4) * 0.18);

    return (
      <span
        className="overlay-wave-bar"
        key={`bar-${index}`}
        style={{ "--bar-scale": String(baseScale) } as CSSProperties}
      />
    );
  });

  return (
    <div className={`overlay-shell ${overlayState.visible ? "is-visible" : ""}`}>
      <div className={`overlay-pill overlay-${overlayState.status}`}>
        <button
          type="button"
          className="overlay-endcap overlay-button overlay-endcap-left"
          disabled={overlayState.status !== "listening"}
          aria-label={t("overlay.cancel")}
          onClick={() => {
            void emitOverlayAction({ action: "cancel" });
          }}
        >
          <span className="overlay-close-line line-a" />
          <span className="overlay-close-line line-b" />
        </button>

        {isProcessing ? (
          <div className="overlay-thinking">{t("overlay.thinking")}</div>
        ) : (
          <div className="overlay-wave">{bars}</div>
        )}

        <button
          type="button"
          className="overlay-endcap overlay-button overlay-endcap-right"
          disabled={overlayState.status !== "listening"}
          aria-label={t("overlay.finish")}
          onClick={() => {
            void emitOverlayAction({ action: "submit" });
          }}
        >
          <span className="overlay-check-line stem" />
          <span className="overlay-check-line arm" />
        </button>
      </div>
    </div>
  );
}
