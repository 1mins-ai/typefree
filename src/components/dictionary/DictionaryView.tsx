import type { TFunction } from "i18next";

interface DictionaryViewProps {
  t: TFunction;
  dictionaryWords: string[];
  filteredDictionaryWords: string[];
  dictionaryQuery: string;
  onDictionaryQueryChange: (value: string) => void;
  onOpenAddDialog: () => void;
  onOpenEditDialog: (index: number) => void;
  onRemoveWord: (index: number) => void;
  onSave: () => void | Promise<void>;
  saving: boolean;
  error: string;
  saveMessage: string;
}

export function DictionaryView({
  t,
  dictionaryWords,
  filteredDictionaryWords,
  dictionaryQuery,
  onDictionaryQueryChange,
  onOpenAddDialog,
  onOpenEditDialog,
  onRemoveWord,
  onSave,
  saving,
  error,
  saveMessage,
}: DictionaryViewProps) {
  return (
    <section className="content-panel settings-page dictionary-page">
      <div className="settings-header">
        <div>
          <p className="eyebrow">{t("dictionaryPage.eyebrow")}</p>
          <h1 className="settings-title">{t("dictionaryPage.title")}</h1>
          <p className="section-copy">{t("dictionaryPage.copy")}</p>
        </div>
        <div className="dictionary-header-actions">
          <button type="button" className="ghost-button dictionary-new-word" onClick={onOpenAddDialog}>
            {t("dictionaryPage.newWord")}
          </button>
          <button type="button" className="primary-button" onClick={() => void onSave()} disabled={saving}>
            {saving ? t("settingPage.saving") : t("settingPage.saveSettings")}
          </button>
        </div>
      </div>

      <div className="dictionary-toolbar">
        <button type="button" className="dictionary-filter-pill is-active">
          {t("dictionaryPage.allFilter")}
        </button>
        <label className="dictionary-search" aria-label={t("dictionaryPage.searchPlaceholder")}>
          <span className="dictionary-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </span>
          <input
            type="search"
            value={dictionaryQuery}
            onChange={(event) => onDictionaryQueryChange(event.target.value)}
            placeholder={t("dictionaryPage.searchPlaceholder")}
          />
        </label>
      </div>

      {filteredDictionaryWords.length ? (
        <div className="dictionary-grid">
          {filteredDictionaryWords.map((word) => {
            const sourceIndex = dictionaryWords.findIndex((entry) => entry === word);

            return (
              <article className="dictionary-card" key={`${word}-${sourceIndex}`}>
                <div className="dictionary-card-copy">
                  <span className="dictionary-card-accent" aria-hidden="true" />
                  <p>{word}</p>
                </div>
                <div className="dictionary-card-actions">
                  <button
                    type="button"
                    className="dictionary-icon-button"
                    onClick={() => onOpenEditDialog(sourceIndex)}
                    aria-label={t("dictionaryPage.editAriaLabel", { word })}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m4 20 4.2-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" />
                      <path d="m13.5 6.5 3 3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="dictionary-icon-button danger"
                    onClick={() => onRemoveWord(sourceIndex)}
                    aria-label={t("dictionaryPage.deleteAriaLabel", { word })}
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.5 7h15" />
                      <path d="M9.5 4h5" />
                      <path d="M7 7l.8 11.2A2 2 0 0 0 9.8 20h4.4a2 2 0 0 0 2-1.8L17 7" />
                      <path d="M10 10.5v5" />
                      <path d="M14 10.5v5" />
                    </svg>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state dictionary-empty-state">
          <h2>{t("dictionaryPage.emptyTitle")}</h2>
          <p>
            {dictionaryWords.length ? t("dictionaryPage.emptySearchCopy") : t("dictionaryPage.emptyCopy")}
          </p>
        </div>
      )}

      {error ? <p className="error-banner">{error}</p> : null}
      {saveMessage ? <p className="save-banner">{saveMessage}</p> : null}
    </section>
  );
}
