import { historyRetentionOptions, languageOptions, llmProviderOptions, speechProviderOptions } from "../../constants/app";
import type { AppSettings, HistoryRetention, LlmProvider } from "../../types";
import type { TFunction } from "i18next";

interface SettingsViewProps {
  t: TFunction;
  settings: AppSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSave: () => void | Promise<void>;
  saving: boolean;
  error: string;
  saveMessage: string;
  autostartEnabled: boolean;
  autostartLoading: boolean;
  onAutostartToggle: (enabled: boolean) => void | Promise<void>;
  openRouterKeyInputRef: React.RefObject<HTMLInputElement | null>;
  googleKeyInputRef: React.RefObject<HTMLInputElement | null>;
}

export function SettingsView({
  t,
  settings,
  onSettingsChange,
  onSave,
  saving,
  error,
  saveMessage,
  autostartEnabled,
  autostartLoading,
  onAutostartToggle,
  openRouterKeyInputRef,
  googleKeyInputRef,
}: SettingsViewProps) {
  return (
    <section className="content-panel settings-page">
      <div className="settings-header">
        <h1 className="settings-title">{t("settingPage.title")}</h1>
        <button type="button" className="primary-button" onClick={() => void onSave()} disabled={saving}>
          {saving ? t("settingPage.saving") : t("settingPage.saveSettings")}
        </button>
      </div>

      <div className="settings-sections">
        <div className="setting-row">
          <div className="setting-info">
            <p className="setting-label">{t("settingPage.launchOnStartup")}</p>
            <p className="setting-desc">{t("settingPage.launchOnStartupDesc")}</p>
          </div>
          <div className="setting-control setting-control-toggle">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={autostartEnabled}
                disabled={autostartLoading}
                onChange={(event) => void onAutostartToggle(event.target.checked)}
              />
            </label>
          </div>
        </div>

        <div className="settings-section-divider">
          <span className="settings-section-icon" aria-hidden="true">AI</span>
          <span>{t("settingPage.sectionLlm")}</span>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <p className="setting-label">{t("settingPage.llmProvider")}</p>
            <p className="setting-desc">{t("settingPage.llmProviderDesc")}</p>
          </div>
          <div className="setting-control">
            <select
              value={settings.llmProvider}
              onChange={(event) => {
                onSettingsChange((current) => ({
                  ...current,
                  llmProvider: event.target.value as LlmProvider,
                }));
              }}
            >
              {llmProviderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {settings.llmProvider === "openrouter" ? (
          <>
            <div className="setting-row">
              <div className="setting-info">
                <p className="setting-label">{t("settingPage.openrouterApiKey")}</p>
                <p className="setting-desc">{t("settingPage.openrouterApiKeyDesc")}</p>
              </div>
              <div className="setting-control">
                <input ref={openRouterKeyInputRef} type="password" defaultValue={settings.openrouterApiKey} autoComplete="off" />
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <p className="setting-label">{t("settingPage.openrouterModel")}</p>
                <p className="setting-desc">{t("settingPage.openrouterModelDesc")}</p>
              </div>
              <div className="setting-control">
                <input
                  value={settings.openrouterModel}
                  onChange={(event) => {
                    onSettingsChange((current) => ({ ...current, openrouterModel: event.target.value }));
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="setting-row">
              <div className="setting-info">
                <p className="setting-label">{t("settingPage.ollamaBaseUrl")}</p>
                <p className="setting-desc">{t("settingPage.ollamaBaseUrlDesc")}</p>
              </div>
              <div className="setting-control">
                <input
                  value={settings.ollamaBaseUrl}
                  onChange={(event) => {
                    onSettingsChange((current) => ({ ...current, ollamaBaseUrl: event.target.value }));
                  }}
                />
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <p className="setting-label">{t("settingPage.ollamaModel")}</p>
                <p className="setting-desc">{t("settingPage.ollamaModelDesc")}</p>
              </div>
              <div className="setting-control">
                <input
                  value={settings.ollamaModel}
                  onChange={(event) => {
                    onSettingsChange((current) => ({ ...current, ollamaModel: event.target.value }));
                  }}
                />
              </div>
            </div>
          </>
        )}

        <div className="setting-row">
          <div className="setting-info">
            <p className="setting-label">{t("settingPage.enableCleanup")}</p>
            <p className="setting-desc">{t("settingPage.enableCleanupDesc")}</p>
          </div>
          <div className="setting-control setting-control-toggle">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.cleanupEnabled}
                onChange={(event) => {
                  onSettingsChange((current) => ({ ...current, cleanupEnabled: event.target.checked }));
                }}
              />
            </label>
          </div>
        </div>

        <div className="settings-section-divider">
          <span className="settings-section-icon" aria-hidden="true">Mic</span>
          <span>{t("settingPage.sectionSpeech")}</span>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <p className="setting-label">{t("settingPage.speechProvider")}</p>
            <p className="setting-desc">{t("settingPage.speechProviderDesc")}</p>
          </div>
          <div className="setting-control">
            <select value={settings.speechProvider} onChange={() => undefined}>
              {speechProviderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <p className="setting-label">{t("settingPage.googleApiKey")}</p>
            <p className="setting-desc">{t("settingPage.googleApiKeyDesc")}</p>
          </div>
          <div className="setting-control">
            <input ref={googleKeyInputRef} type="password" defaultValue={settings.googleApiKey} autoComplete="off" />
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <p className="setting-label">{t("settingPage.sourceLanguage")}</p>
            <p className="setting-desc">{t("settingPage.sourceLanguageDesc")}</p>
          </div>
          <div className="setting-control">
            <select
              value={settings.sourceLanguage}
              onChange={(event) => {
                onSettingsChange((current) => ({ ...current, sourceLanguage: event.target.value }));
              }}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-section-divider">
          <span className="settings-section-icon" aria-hidden="true">Save</span>
          <span>{t("settingPage.sectionStorage")}</span>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <p className="setting-label">{t("settingPage.historyRetention")}</p>
            <p className="setting-desc">{t("settingPage.historyRetentionDesc")}</p>
          </div>
          <div className="setting-control">
            <select
              value={settings.historyRetention}
              onChange={(event) => {
                onSettingsChange((current) => ({
                  ...current,
                  historyRetention: event.target.value as HistoryRetention,
                }));
              }}
            >
              {historyRetentionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}
      {saveMessage ? <p className="save-banner">{saveMessage}</p> : null}
    </section>
  );
}
