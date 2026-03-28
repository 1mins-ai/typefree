import type { TFunction } from "i18next";
import type { UiLanguage } from "../../constants/app";

interface OnboardingViewProps {
  t: TFunction;
  currentLanguage: string;
  languageLabel: string;
  languageOptions: Array<{ value: UiLanguage; label: string }>;
  permissionGranted: boolean;
  permissionLoading: boolean;
  completionLoading: boolean;
  error: string;
  onLanguageChange: (language: string) => void;
  onRequestPermission: () => void | Promise<void>;
  onFinish: () => void | Promise<void>;
}

export function OnboardingView({
  t,
  currentLanguage,
  languageLabel,
  languageOptions,
  permissionGranted,
  permissionLoading,
  completionLoading,
  error,
  onLanguageChange,
  onRequestPermission,
  onFinish,
}: OnboardingViewProps) {
  return (
    <div className="onboarding-shell">
      <section className="onboarding-card">
        <div className="onboarding-topbar">
          <div>
            <p className="onboarding-eyebrow">{t("onboarding.eyebrow")}</p>
            <h1 className="onboarding-title">{t("onboarding.title")}</h1>
          </div>

          <label className="onboarding-language">
            <span>{languageLabel}</span>
            <select value={currentLanguage} onChange={(event) => onLanguageChange(event.target.value)}>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="onboarding-copy">{t("onboarding.copy")}</p>

        <div className="onboarding-steps" aria-label={t("onboarding.stepsLabel")}>
          <article className="onboarding-step">
            <span className="onboarding-step-number">1</span>
            <div>
              <h2>{t("onboarding.stepLanguageTitle")}</h2>
              <p>{t("onboarding.stepLanguageCopy")}</p>
            </div>
          </article>
          <article className="onboarding-step">
            <span className="onboarding-step-number">2</span>
            <div>
              <h2>{t("onboarding.stepPermissionTitle")}</h2>
              <p>{t("onboarding.stepPermissionCopy")}</p>
            </div>
          </article>
          <article className="onboarding-step">
            <span className="onboarding-step-number">3</span>
            <div>
              <h2>{t("onboarding.stepReadyTitle")}</h2>
              <p>{t("onboarding.stepReadyCopy")}</p>
            </div>
          </article>
        </div>

        <div className="onboarding-callout">
          <strong>{t("onboarding.permissionTitle")}</strong>
          <p>{t("onboarding.permissionCopy")}</p>
          <p className={`onboarding-permission-state ${permissionGranted ? "is-granted" : ""}`}>
            {permissionGranted ? t("onboarding.permissionGranted") : t("onboarding.permissionPending")}
          </p>
        </div>

        {error ? <p className="onboarding-error">{error}</p> : null}

        <div className="onboarding-actions">
          <button
            type="button"
            className="onboarding-button onboarding-button-secondary"
            onClick={() => void onRequestPermission()}
            disabled={permissionLoading || completionLoading}
          >
            {permissionLoading ? t("onboarding.requesting") : t("onboarding.allowMic")}
          </button>

          <button
            type="button"
            className="onboarding-button"
            onClick={() => void onFinish()}
            disabled={!permissionGranted || completionLoading || permissionLoading}
          >
            {completionLoading ? t("onboarding.finishing") : t("onboarding.finish")}
          </button>
        </div>
      </section>
    </div>
  );
}
