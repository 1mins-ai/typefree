import { sidebarLanguageOptions, sidebarNavItems } from "../../constants/app";
import brandIcon from "../../assets/branding/typefree-logo.png";
import type { AppView } from "../../constants/app";

interface AppSidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  availableAnywhereLabel: string;
  availableAnywhereCopy: string;
  languageLabel: string;
  renderLabel: (key: string) => string;
}

export function AppSidebar({
  activeView,
  onViewChange,
  currentLanguage,
  onLanguageChange,
  availableAnywhereLabel,
  availableAnywhereCopy,
  languageLabel,
  renderLabel,
}: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">
          <img src={brandIcon} alt="TypeFree" className="brand-mark-image" />
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {sidebarNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${activeView === item.id ? "is-active" : ""}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="sidebar-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{renderLabel(item.labelKey)}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-card">
        <p className="sidebar-card-title">{availableAnywhereLabel}</p>
        <p className="sidebar-card-copy">{availableAnywhereCopy}</p>
      </div>

      <div className="sidebar-footer">
        <label className="sidebar-language">
          <span className="footer-label">{languageLabel}</span>
          <select
            className="sidebar-language-select"
            value={currentLanguage}
            onChange={(event) => onLanguageChange(event.target.value)}
          >
            {sidebarLanguageOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  );
}
