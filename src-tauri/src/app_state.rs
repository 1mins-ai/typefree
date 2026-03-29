use std::{
    fs,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, Manager, Runtime};

use crate::settings::{AppSettings, HistoryEntry, OverlayState};

pub struct AppState {
    settings: Mutex<AppSettings>,
    history: Mutex<Vec<HistoryEntry>>,
    overlay_state: Mutex<OverlayState>,
    quitting: Mutex<bool>,
}

impl AppState {
    pub fn new(settings: AppSettings, history: Vec<HistoryEntry>) -> Self {
        Self {
            settings: Mutex::new(settings),
            history: Mutex::new(history),
            overlay_state: Mutex::new(OverlayState::default()),
            quitting: Mutex::new(false),
        }
    }

    pub fn settings(&self) -> AppSettings {
        self.settings.lock().expect("settings lock").clone()
    }

    pub fn update_settings(&self, settings: AppSettings) {
        *self.settings.lock().expect("settings lock") = settings;
    }

    pub fn history(&self) -> Vec<HistoryEntry> {
        self.history.lock().expect("history lock").clone()
    }

    pub fn update_history(&self, history: Vec<HistoryEntry>) {
        *self.history.lock().expect("history lock") = history;
    }

    pub fn overlay_state(&self) -> OverlayState {
        self.overlay_state.lock().expect("overlay lock").clone()
    }

    pub fn update_overlay_state(&self, overlay_state: OverlayState) {
        *self.overlay_state.lock().expect("overlay lock") = overlay_state;
    }

    pub fn set_quitting(&self, quitting: bool) {
        *self.quitting.lock().expect("quitting lock") = quitting;
    }

    pub fn is_quitting(&self) -> bool {
        *self.quitting.lock().expect("quitting lock")
    }
}

pub fn settings_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let app_config_dir = config_dir(app)?;
    Ok(app_config_dir.join("settings.json"))
}

pub fn history_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let app_config_dir = config_dir(app)?;
    Ok(app_config_dir.join("history.json"))
}

fn config_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Failed to resolve app config dir: {error}"))?;

    fs::create_dir_all(&app_config_dir)
        .map_err(|error| format!("Failed to create app config dir: {error}"))?;

    Ok(app_config_dir)
}

pub fn load_settings_from_disk<R: Runtime>(app: &AppHandle<R>) -> Result<AppSettings, String> {
    let path = settings_path(app)?;

    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let content =
        fs::read_to_string(path).map_err(|error| format!("Failed to read settings: {error}"))?;
    serde_json::from_str::<AppSettings>(&content)
        .map(|settings| settings.normalized())
        .map_err(|error| format!("Failed to parse settings JSON: {error}"))
}

pub fn save_settings_to_disk<R: Runtime>(
    app: &AppHandle<R>,
    settings: &AppSettings,
) -> Result<(), String> {
    let path = settings_path(app)?;
    let payload = serde_json::to_string_pretty(&settings.clone().normalized())
        .map_err(|error| format!("Failed to serialize settings: {error}"))?;
    fs::write(path, payload).map_err(|error| format!("Failed to write settings: {error}"))
}

pub fn load_history_from_disk<R: Runtime>(
    app: &AppHandle<R>,
    retention: &str,
) -> Result<Vec<HistoryEntry>, String> {
    let path = history_path(app)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let content =
        fs::read_to_string(path).map_err(|error| format!("Failed to read history: {error}"))?;
    let entries = serde_json::from_str::<Vec<HistoryEntry>>(&content)
        .map_err(|error| format!("Failed to parse history JSON: {error}"))?;

    Ok(prune_history(entries, retention))
}

pub fn save_history_to_disk<R: Runtime>(
    app: &AppHandle<R>,
    entries: &[HistoryEntry],
    retention: &str,
) -> Result<Vec<HistoryEntry>, String> {
    let path = history_path(app)?;
    let pruned = prune_history(entries.to_vec(), retention);
    let payload = serde_json::to_string_pretty(&pruned)
        .map_err(|error| format!("Failed to serialize history: {error}"))?;
    fs::write(path, payload).map_err(|error| format!("Failed to write history: {error}"))?;
    Ok(pruned)
}

pub fn new_history_entry(raw_transcript: String, cleaned_text: String) -> HistoryEntry {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default();

    HistoryEntry {
        id: format!("entry-{timestamp}"),
        timestamp,
        raw_transcript,
        cleaned_text,
    }
}

fn prune_history(mut entries: Vec<HistoryEntry>, retention: &str) -> Vec<HistoryEntry> {
    entries.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default();

    let cutoff = match retention {
        "day" => Some(now - 86_400_000),
        "week" => Some(now - 7 * 86_400_000),
        "month" => Some(now - 30 * 86_400_000),
        _ => None,
    };

    if let Some(cutoff_timestamp) = cutoff {
        entries.retain(|entry| entry.timestamp >= cutoff_timestamp);
    }

    entries
}
