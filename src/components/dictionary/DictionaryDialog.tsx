import type { TFunction } from "i18next";

interface DictionaryDialogProps {
  t: TFunction;
  open: boolean;
  mode: "add" | "edit";
  draft: string;
  validation: string;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onClearValidation: () => void;
}

export function DictionaryDialog({
  t,
  open,
  mode,
  draft,
  validation,
  onDraftChange,
  onClose,
  onSubmit,
  onClearValidation,
}: DictionaryDialogProps) {
  if (!open) return null;

  return (
    <div className="dictionary-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="dictionary-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dictionary-dialog-title"
      >
        <button
          type="button"
          className="dictionary-modal-close"
          onClick={onClose}
          aria-label={t("dictionaryPage.closeModal")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 6 12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>

        <div className="dictionary-modal-body">
          <h2 id="dictionary-dialog-title">
            {mode === "edit" ? t("dictionaryPage.editTitle") : t("dictionaryPage.addTitle")}
          </h2>

          <label className="dictionary-modal-field">
            <span>{t("dictionaryPage.wordInputLabel")}</span>
            <input
              type="text"
              value={draft}
              onChange={(event) => {
                onDraftChange(event.target.value);
                if (validation) {
                  onClearValidation();
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder={t("dictionaryPage.wordsPlaceholder")}
              autoFocus
            />
          </label>

          {validation ? <p className="dictionary-modal-error">{validation}</p> : null}

          <div className="dictionary-modal-actions">
            <button type="button" className="ghost-button" onClick={onClose}>
              {t("dictionaryPage.cancel")}
            </button>
            <button type="button" className="primary-button" onClick={onSubmit}>
              {t("dictionaryPage.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
