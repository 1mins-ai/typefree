import type { TFunction } from "i18next";
import { formatTimestamp, getHistoryRetentionLabel, groupHistoryEntries } from "../../lib/appHelpers";
import type { AppSettings, HistoryEntry } from "../../types";

interface HistoryViewProps {
  t: TFunction;
  settings: AppSettings;
  history: HistoryEntry[];
  onCopy: (text: string) => void | Promise<void>;
  onDelete: (entryId: string) => void | Promise<void>;
}

export function HistoryView({
  t,
  settings,
  history,
  onCopy,
  onDelete,
}: HistoryViewProps) {
  const historyGroups = groupHistoryEntries(history);

  return (
    <section className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{t("historyPage.eyebrow")}</p>
          <h1 className="section-title">{t("historyPage.title")}</h1>
          <p className="section-copy">{t("historyPage.copy")}</p>
        </div>
      </div>

      <div className="history-toolbar">
        <div className="history-chip">
          {t("historyPage.keepingFor")} <strong>{getHistoryRetentionLabel(settings, t)}</strong>
        </div>
        <div className="history-chip">{t("historyPage.entriesSaved", { count: history.length })}</div>
      </div>

      {historyGroups.length ? (
        <div className="history-groups">
          {historyGroups.map(([label, entries]) => (
            <section className="history-group" key={label}>
              <h2 className="history-heading">{label}</h2>
              <div className="history-list">
                {entries.map((entry) => (
                  <article className="history-row" key={entry.id}>
                    <div className="history-time">{formatTimestamp(entry.timestamp)}</div>
                    <div className="history-content">
                      <p className="history-raw">{entry.rawTranscript}</p>
                      <p className="history-cleaned">{entry.cleanedText}</p>
                    </div>
                    <div className="history-actions">
                      <button type="button" className="ghost-button" onClick={() => void onCopy(entry.cleanedText)}>
                        {t("historyPage.copyButton")}
                      </button>
                      <button type="button" className="ghost-button ghost-danger" onClick={() => void onDelete(entry.id)}>
                        {t("historyPage.deleteButton")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{t("historyPage.emptyTitle")}</h2>
          <p>{t("historyPage.emptyCopy")}</p>
        </div>
      )}
    </section>
  );
}
