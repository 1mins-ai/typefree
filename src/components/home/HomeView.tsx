import { countWords, getSourceLanguageLabel, providerSummary, speechProviderSummary, statusText } from "../../lib/appHelpers";
import type { AppSettings, HistoryEntry, SessionStatus } from "../../types";
import type { TFunction } from "i18next";

interface HomeViewProps {
  t: TFunction;
  settings: AppSettings;
  history: HistoryEntry[];
  status: SessionStatus;
  micLevel: number;
  error: string;
  transcript: string;
  cleanedText: string;
  onCopyLatest: (text: string) => void | Promise<void>;
}

export function HomeView({
  t,
  settings,
  history,
  status,
  micLevel,
  error,
  transcript,
  cleanedText,
  onCopyLatest,
}: HomeViewProps) {
  const latestEntry = history[0];
  const latestRaw = transcript || latestEntry?.rawTranscript || "";
  const latestCleaned = cleanedText || latestEntry?.cleanedText || "";
  const totalWords = history.reduce((sum, entry) => sum + countWords(entry.cleanedText), 0);
  const averageWords = history.length ? Math.round(totalWords / history.length) : 0;

  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">{t("home.eyebrow")}</p>
          <h1>{t("home.heroTitle")}</h1>
          <p className="hero-copy">
            {t("home.heroCopy", { hotkey: settings.globalHotkey }).split(/<keycap>|<\/keycap>/).map((part, index) =>
              index % 2 === 1 ? <span className="keycap" key={`${part}-${index}`}>{part}</span> : part,
            )}
          </p>
        </div>

        {status !== "idle" ? (
          <div className={`hero-status hero-status-${status}`}>
            <span className="status-dot" />
            <div>
              <p className="hero-status-label">{statusText(status, t)}</p>
              <p className="hero-status-copy">
                {status === "listening"
                  ? t("home.micLevel", { level: Math.round(micLevel * 100) })
                  : error || t(`status.${status}`)}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <p className="summary-label">{t("summary.savedDictations")}</p>
          <strong className="summary-value">{history.length}</strong>
        </article>
        <article className="summary-card">
          <p className="summary-label">{t("summary.wordsDictated")}</p>
          <strong className="summary-value">{totalWords}</strong>
        </article>
        <article className="summary-card">
          <p className="summary-label">{t("summary.avgWords")}</p>
          <strong className="summary-value">{averageWords}</strong>
        </article>
        <article className="summary-card">
          <p className="summary-label">{t("summary.currentProvider")}</p>
          <strong className="summary-value">{settings.llmProvider === "openrouter" ? "OpenRouter" : "Ollama"}</strong>
        </article>
      </section>

      <section className="details-grid">
        <article className="panel-card summary-stack">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{t("workspace.eyebrow")}</p>
              <h2>{t("workspace.title")}</h2>
            </div>
          </div>

          <div className="detail-row">
            <span>{t("workspace.provider")}</span>
            <strong>{settings.llmProvider === "openrouter" ? "OpenRouter" : "Ollama"}</strong>
          </div>
          <div className="detail-row">
            <span>{t("workspace.model")}</span>
            <strong>{providerSummary(settings, t)}</strong>
          </div>
          <div className="detail-row">
            <span>{t("workspace.speechProvider")}</span>
            <strong>{speechProviderSummary(settings, t)}</strong>
          </div>
          <div className="detail-row">
            <span>{t("workspace.sourceLanguage")}</span>
            <strong>{getSourceLanguageLabel(settings, t)}</strong>
          </div>
          <div className="detail-row">
            <span>{t("workspace.cleanup")}</span>
            <strong>{settings.cleanupEnabled ? t("workspace.enabled") : t("workspace.disabled")}</strong>
          </div>
        </article>

        <article className="latest-card">
          <p className="eyebrow">{t("latest.eyebrow")}</p>
          <h2>{latestCleaned ? t("latest.hasResult") : t("latest.noResult")}</h2>
          {latestRaw ? <p className="latest-raw">{latestRaw}</p> : null}
          <p className="latest-cleaned">{latestCleaned || t("latest.emptyCopy")}</p>
          {latestCleaned ? (
            <button type="button" className="ghost-button" onClick={() => void onCopyLatest(latestCleaned)}>
              {t("latest.copyLatest")}
            </button>
          ) : null}
        </article>
      </section>

      <section className="panel-card feedback-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{t("feedback.eyebrow")}</p>
            <h2>{t("feedback.title")}</h2>
          </div>
        </div>

        <div className="feedback-grid">
          <div className="feedback-block">
            <span>{t("feedback.rawTranscript")}</span>
            <p>{latestRaw || t("feedback.rawEmpty")}</p>
          </div>
          <div className="feedback-block">
            <span>{t("feedback.cleanedOutput")}</span>
            <p>{latestCleaned || t("feedback.cleanedEmpty")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
