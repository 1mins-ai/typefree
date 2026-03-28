use tauri::{AppHandle, Emitter, Manager, Runtime, State};

use crate::{
    app_state::{AppState, new_history_entry, save_history_to_disk, save_settings_to_disk},
    providers::{cleanup_transcript, transcribe_audio},
    settings::{AppSettings, DictationResult, HistoryEntry, OverlayState},
    text_injector::{ClipboardPasteInjector, TextInjector},
};

pub const OVERLAY_LABEL: &str = "overlay";

#[tauri::command]
pub fn load_settings(state: State<'_, AppState>) -> AppSettings {
    state.settings()
}

#[tauri::command]
pub fn save_settings<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let next_shortcut = settings.global_hotkey.trim();
    if next_shortcut.is_empty() {
        return Err("Global hotkey cannot be empty.".to_string());
    }

    let previous_settings = state.settings();
    register_or_replace_shortcut(&app, &previous_settings.global_hotkey, next_shortcut)?;
    save_settings_to_disk(&app, &settings)
        .map_err(|error| format!("Failed to save settings to disk: {error}"))?;
    let history = state.history();
    let saved_history = save_history_to_disk(&app, &history, &settings.history_retention)?;
    state.update_history(saved_history);
    state.update_settings(settings.clone());
    Ok(settings)
}

#[tauri::command]
pub fn load_history(state: State<'_, AppState>) -> Vec<HistoryEntry> {
    state.history()
}

#[tauri::command]
pub fn delete_history_entry<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    entry_id: String,
) -> Result<Vec<HistoryEntry>, String> {
    let settings = state.settings();
    let mut history = state.history();
    history.retain(|entry| entry.id != entry_id);
    let saved_history = save_history_to_disk(&app, &history, &settings.history_retention)?;
    state.update_history(saved_history.clone());
    Ok(saved_history)
}

#[tauri::command]
pub fn get_overlay_state(state: State<'_, AppState>) -> OverlayState {
    state.overlay_state()
}

#[tauri::command]
pub fn update_overlay_state<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    overlay_state: OverlayState,
) -> Result<(), String> {
    let should_show = overlay_state.visible;
    state.update_overlay_state(overlay_state.clone());
    emit_overlay_state(&app, &overlay_state);

    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        position_overlay_window(&window)?;
        if should_show {
            let _ = window.show();
        }
    }

    Ok(())
}

#[tauri::command]
pub fn show_overlay<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut overlay_state = state.overlay_state();
    overlay_state.visible = true;
    state.update_overlay_state(overlay_state.clone());

    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        position_overlay_window(&window)?;
        window
            .show()
            .map_err(|error| format!("Failed to show overlay window: {error}"))?;
    }

    emit_overlay_state(&app, &overlay_state);
    Ok(())
}

#[tauri::command]
pub fn hide_overlay<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut overlay_state = state.overlay_state();
    overlay_state.visible = false;
    overlay_state.level = 0.0;
    state.update_overlay_state(overlay_state.clone());

    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        window
            .hide()
            .map_err(|error| format!("Failed to hide overlay window: {error}"))?;
    }

    emit_overlay_state(&app, &overlay_state);
    Ok(())
}

#[tauri::command]
pub async fn process_dictation<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    audio_base64: String,
    mime_type: String,
    settings: AppSettings,
) -> Result<DictationResult, String> {
    let settings = merge_runtime_settings(&state.settings(), settings);
    let injector = ClipboardPasteInjector::new();

    set_session_status(&app, &state, "transcribing", 0.0);
    let transcript = transcribe_audio(&audio_base64, &mime_type, &settings).await?;

    if settings.cleanup_enabled {
        set_session_status(&app, &state, "cleaning", 0.0);
    } else {
        set_session_status(&app, &state, "inserting", 0.0);
    }
    let cleaned_text = cleanup_transcript(&transcript, &settings).await?;

    set_session_status(&app, &state, "inserting", 0.0);
    injector.insert(&cleaned_text)?;

    let history_entry = new_history_entry(transcript.clone(), cleaned_text.clone());
    let mut history = state.history();
    history.insert(0, history_entry.clone());
    let saved_history = save_history_to_disk(&app, &history, &settings.history_retention)?;
    state.update_history(saved_history);

    Ok(DictationResult {
        transcript,
        cleaned_text: cleaned_text.clone(),
        inserted_text: cleaned_text,
        history_entry,
    })
}

fn merge_runtime_settings(stored: &AppSettings, incoming: AppSettings) -> AppSettings {
    AppSettings {
        speech_provider: if incoming.speech_provider.trim().is_empty() {
            stored.speech_provider.clone()
        } else {
            incoming.speech_provider
        },
        llm_provider: if incoming.llm_provider.trim().is_empty() {
            stored.llm_provider.clone()
        } else {
            incoming.llm_provider
        },
        openrouter_api_key: if incoming.openrouter_api_key.trim().is_empty() {
            stored.openrouter_api_key.clone()
        } else {
            incoming.openrouter_api_key
        },
        openrouter_model: if incoming.openrouter_model.trim().is_empty() {
            stored.openrouter_model.clone()
        } else {
            incoming.openrouter_model
        },
        ollama_base_url: if incoming.ollama_base_url.trim().is_empty() {
            stored.ollama_base_url.clone()
        } else {
            incoming.ollama_base_url
        },
        ollama_model: if incoming.ollama_model.trim().is_empty() {
            stored.ollama_model.clone()
        } else {
            incoming.ollama_model
        },
        google_api_key: if incoming.google_api_key.trim().is_empty() {
            stored.google_api_key.clone()
        } else {
            incoming.google_api_key
        },
        phrase_hints: incoming.phrase_hints,
        source_language: if incoming.source_language.trim().is_empty() {
            stored.source_language.clone()
        } else {
            incoming.source_language
        },
        global_hotkey: if incoming.global_hotkey.trim().is_empty() {
            stored.global_hotkey.clone()
        } else {
            incoming.global_hotkey
        },
        cleanup_enabled: incoming.cleanup_enabled,
        history_retention: if incoming.history_retention.trim().is_empty() {
            stored.history_retention.clone()
        } else {
            incoming.history_retention
        },
        has_completed_onboarding: incoming.has_completed_onboarding,
    }
}

pub fn register_or_replace_shortcut<R: Runtime>(
    app: &AppHandle<R>,
    previous_shortcut: &str,
    next_shortcut: &str,
) -> Result<(), String> {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

        let previous_shortcut = previous_shortcut.trim();
        let next_shortcut = next_shortcut.trim();

        if previous_shortcut == next_shortcut {
            return Ok(());
        }

        if !previous_shortcut.is_empty() && previous_shortcut != next_shortcut {
            let _ = app.global_shortcut().unregister(previous_shortcut);
        }

        if app.global_shortcut().is_registered(next_shortcut) {
            return Err(format!(
                "Global hotkey '{next_shortcut}' is already registered. Pick another shortcut."
            ));
        }

        app.global_shortcut()
            .on_shortcut(next_shortcut, move |handle, shortcut, event| {
                if !matches!(event.state(), ShortcutState::Pressed) {
                    return;
                }

                let _ = handle.emit(
                    "dictation-hotkey-state",
                    serde_json::json!({
                        "state": "triggered",
                        "shortcut": shortcut.to_string()
                    }),
                );
            })
            .map_err(|error| {
                format!("Failed to register global hotkey '{next_shortcut}': {error}")
            })?;
    }

    Ok(())
}

pub fn set_session_status<R: Runtime>(
    app: &AppHandle<R>,
    state: &State<'_, AppState>,
    status: &str,
    level: f32,
) {
    let mut overlay_state = state.overlay_state();
    overlay_state.status = status.to_string();
    overlay_state.level = level;
    overlay_state.visible = !matches!(status, "idle");
    overlay_state.message = overlay_message(status);
    state.update_overlay_state(overlay_state.clone());
    emit_session_status(app, status);
    emit_overlay_state(app, &overlay_state);

    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = position_overlay_window(&window);
        if overlay_state.visible {
            let _ = window.show();
        }
    }
}

pub fn emit_overlay_state<R: Runtime>(app: &AppHandle<R>, overlay_state: &OverlayState) {
    let _ = app.emit("overlay-state", overlay_state);
}

fn emit_session_status<R: Runtime>(app: &AppHandle<R>, status: &str) {
    let _ = app.emit(
        "dictation-session-status",
        serde_json::json!({
            "status": status
        }),
    );
}

fn overlay_message(status: &str) -> String {
    match status {
        "listening" => "Listening... press the shortcut again to stop.".to_string(),
        "transcribing" => "Transcribing...".to_string(),
        "cleaning" => "Cleaning transcript...".to_string(),
        "inserting" => "Inserting into the active app...".to_string(),
        "done" => "Inserted.".to_string(),
        "error" => "Something went wrong.".to_string(),
        _ => String::new(),
    }
}

pub fn position_overlay_window<R: Runtime>(window: &tauri::WebviewWindow<R>) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|error| format!("Failed to get current monitor: {error}"))?
        .or_else(|| window.primary_monitor().map_err(|_| ()).ok().flatten());

    let Some(monitor) = monitor else {
        return Ok(());
    };

    let size = monitor.size();
    let position = monitor.position();
    let x = position.x + ((size.width as i32 - 240) / 2);
    let y = position.y + size.height as i32 - 76;

    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
        .map_err(|error| format!("Failed to position overlay window: {error}"))?;

    Ok(())
}
