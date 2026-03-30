import { HotkeyRecorder } from "../inputs/HotkeyRecorder";
import { createCustomPromptMapping, normalizePromptMappings } from "../../lib/appHelpers";
import type { AppSettings, PromptMapping } from "../../types";
import type { TFunction } from "i18next";
import { defaultAskCommandMapping } from "../../constants/app";

interface PromptMappingsViewProps {
  t: TFunction;
  settings: AppSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSave: () => void | Promise<void>;
  saving: boolean;
  error: string;
  saveMessage: string;
}

export function PromptMappingsView({
  t,
  settings,
  onSettingsChange,
  onSave,
  saving,
  error,
  saveMessage,
}: PromptMappingsViewProps) {
  const mappings = normalizePromptMappings(settings);
  const defaultMapping = mappings.find((mapping) => mapping.kind === "default") ?? mappings[0];
  const customMappings = mappings.filter((mapping) => mapping.kind === "custom");

  function updateMapping(mappingId: string, updater: (mapping: PromptMapping) => PromptMapping) {
    onSettingsChange((current) => {
      const normalized = normalizePromptMappings(current);

      return {
        ...current,
        promptMappings: normalized.map((mapping) => (
          mapping.id === mappingId ? updater(mapping) : mapping
        )),
      };
    });
  }

  function addMapping() {
    onSettingsChange((current) => ({
      ...current,
      promptMappings: [...normalizePromptMappings(current), createCustomPromptMapping()],
    }));
  }

  function removeMapping(mappingId: string) {
    onSettingsChange((current) => ({
      ...current,
      promptMappings: normalizePromptMappings(current).filter((mapping) => mapping.id !== mappingId),
    }));
  }

  return (
    <section className="content-panel settings-page prompt-page">
      <div className="settings-header">
        <div>
          <p className="eyebrow">{t("promptPage.eyebrow")}</p>
          <h1 className="settings-title">{t("promptPage.title")}</h1>
          <p className="section-copy">{t("promptPage.copy")}</p>
        </div>

        <div className="prompt-header-actions">
          <button type="button" className="ghost-button" onClick={addMapping}>
            {t("promptPage.addMapping")}
          </button>
          <button type="button" className="primary-button" onClick={() => void onSave()} disabled={saving}>
            {saving ? t("settingPage.saving") : t("settingPage.saveSettings")}
          </button>
        </div>
      </div>

      <div className="prompt-list">
        <article className="prompt-card prompt-card-default">
          <div className="prompt-card-top">
            <div>
              <div className="prompt-card-title-row">
                <p className="prompt-title-static" aria-label={t("promptPage.labelLabel")}>
                  {defaultMapping.label}
                </p>
                <span className="prompt-kind-badge">{t("promptPage.defaultBadge")}</span>
              </div>
              <p className="prompt-card-copy">{t("promptPage.defaultCopy")}</p>
            </div>
          </div>

          <div className="prompt-form-grid">
            <div className="prompt-field">
              <label>{t("promptPage.hotkeyLabel")}</label>
              <HotkeyRecorder
                value={defaultMapping.hotkey}
                onChange={(hotkey) => {
                  updateMapping(defaultMapping.id, (mapping) => ({ ...mapping, hotkey }));
                }}
                onClear={() => {
                  updateMapping(defaultMapping.id, (mapping) => ({ ...mapping, hotkey: "" }));
                }}
                recordingLabel={t("settingPage.hotkeyRecording")}
                placeholderLabel={t("settingPage.hotkeyPlaceholder")}
                invalidLabel={t("settingPage.hotkeyInvalid")}
                clearLabel={t("settingPage.hotkeyClear")}
              />
            </div>

            <div className="prompt-field">
              <label>{t("promptPage.promptLabel")}</label>
              <textarea
                rows={5}
                value={defaultMapping.prompt}
                onChange={(event) => {
                  updateMapping(defaultMapping.id, (mapping) => ({ ...mapping, prompt: event.target.value }));
                }}
                placeholder={t("promptPage.defaultPromptPlaceholder")}
              />
            </div>
          </div>
        </article>

        {customMappings.map((mapping) => (
          <article className="prompt-card" key={mapping.id}>
            <div className="prompt-card-top">
              <div>
                <div className="prompt-card-title-row">
                  {mapping.id === defaultAskCommandMapping.id ? (
                    <p className="prompt-title-static" aria-label={t("promptPage.labelLabel")}>
                      {mapping.label}
                    </p>
                  ) : (
                    <input
                      className="prompt-title-input"
                      value={mapping.label}
                      onChange={(event) => {
                        updateMapping(mapping.id, (current) => ({ ...current, label: event.target.value }));
                      }}
                      placeholder={t("promptPage.customLabelPlaceholder")}
                      aria-label={t("promptPage.labelLabel")}
                    />
                  )}
                  <span className={`prompt-kind-badge ${mapping.id === defaultAskCommandMapping.id ? "" : "is-custom"}`}>
                    {mapping.id === defaultAskCommandMapping.id ? t("promptPage.defaultBadge") : t("promptPage.customBadge")}
                  </span>
                </div>
                <p className="prompt-card-copy">{t("promptPage.customCopy")}</p>
              </div>

              {mapping.id !== defaultAskCommandMapping.id ? (
                <button
                  type="button"
                  className="dictionary-icon-button danger"
                  onClick={() => removeMapping(mapping.id)}
                  aria-label={t("promptPage.deleteMapping")}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 7h15" />
                    <path d="M9.5 4h5" />
                    <path d="M7 7l.8 11.2A2 2 0 0 0 9.8 20h4.4a2 2 0 0 0 2-1.8L17 7" />
                    <path d="M10 10.5v5" />
                    <path d="M14 10.5v5" />
                  </svg>
                </button>
              ) : null}
            </div>

            <div className="prompt-form-grid">
              <div className="prompt-field">
                <label>{t("promptPage.hotkeyLabel")}</label>
                <HotkeyRecorder
                  value={mapping.hotkey}
                  onChange={(hotkey) => {
                    updateMapping(mapping.id, (current) => ({ ...current, hotkey }));
                  }}
                  onClear={() => {
                    updateMapping(mapping.id, (current) => ({ ...current, hotkey: "" }));
                  }}
                  recordingLabel={t("settingPage.hotkeyRecording")}
                  placeholderLabel={t("settingPage.hotkeyPlaceholder")}
                  invalidLabel={t("settingPage.hotkeyInvalid")}
                  clearLabel={t("settingPage.hotkeyClear")}
                />
              </div>

              <div className="prompt-field">
                <label>{t("promptPage.promptLabel")}</label>
                <textarea
                  rows={5}
                  value={mapping.prompt}
                  onChange={(event) => {
                    updateMapping(mapping.id, (current) => ({ ...current, prompt: event.target.value }));
                  }}
                  placeholder={t("promptPage.promptPlaceholder")}
                />
              </div>
            </div>
          </article>
        ))}

        {!customMappings.length ? (
          <div className="empty-state prompt-empty-state">
            <h2>{t("promptPage.emptyTitle")}</h2>
            <p>{t("promptPage.emptyCopy")}</p>
          </div>
        ) : null}
      </div>

      {error ? <p className="error-banner">{error}</p> : null}
      {saveMessage ? <p className="save-banner">{saveMessage}</p> : null}
    </section>
  );
}
