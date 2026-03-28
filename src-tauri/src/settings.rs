use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_speech_provider")]
    pub speech_provider: String,
    #[serde(default = "default_llm_provider")]
    pub llm_provider: String,
    #[serde(default)]
    pub openrouter_api_key: String,
    #[serde(default = "default_openrouter_model")]
    pub openrouter_model: String,
    #[serde(default = "default_ollama_base_url")]
    pub ollama_base_url: String,
    #[serde(default = "default_ollama_model")]
    pub ollama_model: String,
    #[serde(default)]
    pub google_api_key: String,
    #[serde(default)]
    pub phrase_hints: String,
    #[serde(default = "default_source_language")]
    pub source_language: String,
    #[serde(default = "default_global_hotkey")]
    pub global_hotkey: String,
    #[serde(default = "default_cleanup_enabled")]
    pub cleanup_enabled: bool,
    #[serde(default = "default_history_retention")]
    pub history_retention: String,
    #[serde(default)]
    pub has_completed_onboarding: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            speech_provider: "google".to_string(),
            llm_provider: "openrouter".to_string(),
            openrouter_api_key: String::new(),
            openrouter_model: "openai/gpt-4o-mini".to_string(),
            ollama_base_url: "http://localhost:11434".to_string(),
            ollama_model: "llama3.2".to_string(),
            google_api_key: String::new(),
            phrase_hints: String::new(),
            source_language: "yue-Hant-HK".to_string(),
            global_hotkey: "Ctrl+`".to_string(),
            cleanup_enabled: true,
            history_retention: "forever".to_string(),
            has_completed_onboarding: false,
        }
    }
}

fn default_speech_provider() -> String {
    "google".to_string()
}

fn default_llm_provider() -> String {
    "openrouter".to_string()
}

fn default_openrouter_model() -> String {
    "openai/gpt-4o-mini".to_string()
}

fn default_ollama_base_url() -> String {
    "http://localhost:11434".to_string()
}

fn default_ollama_model() -> String {
    "llama3.2".to_string()
}

fn default_source_language() -> String {
    "yue-Hant-HK".to_string()
}

fn default_global_hotkey() -> String {
    "Ctrl+`".to_string()
}

fn default_cleanup_enabled() -> bool {
    true
}

fn default_history_retention() -> String {
    "forever".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub timestamp: i64,
    pub raw_transcript: String,
    pub cleaned_text: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationResult {
    pub transcript: String,
    pub cleaned_text: String,
    pub inserted_text: String,
    pub history_entry: HistoryEntry,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayState {
    pub visible: bool,
    pub status: String,
    pub level: f32,
    pub message: String,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            visible: false,
            status: "idle".to_string(),
            level: 0.0,
            message: String::new(),
        }
    }
}
