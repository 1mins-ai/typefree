import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { defaultOverlayState } from "../../constants/app";
import { getOverlayState, listenForOverlayState } from "../../lib/tauri";
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
    void currentWindow.setIgnoreCursorEvents(true);

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
        <div className="overlay-endcap overlay-endcap-left">
          <span className="overlay-close-line line-a" />
          <span className="overlay-close-line line-b" />
        </div>

        {isProcessing ? (
          <div className="overlay-thinking">{t("overlay.thinking")}</div>
        ) : (
          <div className="overlay-wave">{bars}</div>
        )}

        <div className="overlay-endcap overlay-endcap-right">
          <span className="overlay-check-line stem" />
          <span className="overlay-check-line arm" />
        </div>
      </div>
    </div>
  );
}
