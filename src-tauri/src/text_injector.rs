use std::{
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};

pub trait TextInjector {
    fn insert(&self, text: &str) -> Result<(), String>;
}

pub struct ClipboardPasteInjector;

impl ClipboardPasteInjector {
    pub fn new() -> Self {
        Self
    }

    pub fn capture_selected_text(&self) -> Result<String, String> {
        let mut clipboard =
            Clipboard::new().map_err(|error| format!("Clipboard unavailable: {error}"))?;
        let previous = clipboard.get_text().ok();
        let sentinel = format!(
            "__TYPEFREE_SELECTION_SENTINEL_{}__",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_nanos())
                .unwrap_or(0)
        );
        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|error| format!("Input unavailable: {error}"))?;

        let _ = clipboard.set_text(sentinel.clone());
        trigger_copy_shortcut(&mut enigo)?;
        thread::sleep(Duration::from_millis(180));

        let copied = clipboard.get_text().unwrap_or_default();
        if let Some(previous_text) = previous.as_ref() {
            let _ = clipboard.set_text(previous_text.clone());
        } else {
            let _ = clipboard.set_text(String::new());
        }

        if copied.is_empty() || copied == sentinel {
            return Ok(String::new());
        }

        Ok(copied)
    }
}

impl TextInjector for ClipboardPasteInjector {
    fn insert(&self, text: &str) -> Result<(), String> {
        let mut clipboard =
            Clipboard::new().map_err(|error| format!("Clipboard unavailable: {error}"))?;

        let previous = clipboard.get_text().ok();
        clipboard
            .set_text(text.to_string())
            .map_err(|error| format!("Failed to copy output to clipboard: {error}"))?;

        let mut enigo = Enigo::new(&Settings::default())
            .map_err(|error| format!("Input unavailable: {error}"))?;

        trigger_paste_shortcut(&mut enigo)?;

        thread::sleep(Duration::from_millis(120));

        if let Some(previous) = previous {
            let _ = clipboard.set_text(previous);
        }

        Ok(())
    }
}

fn trigger_paste_shortcut(enigo: &mut Enigo) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        enigo
            .key(Key::Meta, Direction::Press)
            .map_err(|error| format!("Failed to press Command key: {error}"))?;
        enigo
            .key(Key::Unicode('v'), Direction::Click)
            .map_err(|error| format!("Failed to trigger paste: {error}"))?;
        enigo
            .key(Key::Meta, Direction::Release)
            .map_err(|error| format!("Failed to release Command key: {error}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        enigo
            .key(Key::Control, Direction::Press)
            .map_err(|error| format!("Failed to press Control key: {error}"))?;
        enigo
            .key(Key::Unicode('v'), Direction::Click)
            .map_err(|error| format!("Failed to trigger paste: {error}"))?;
        enigo
            .key(Key::Control, Direction::Release)
            .map_err(|error| format!("Failed to release Control key: {error}"))?;
    }

    Ok(())
}

fn trigger_copy_shortcut(enigo: &mut Enigo) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        enigo
            .key(Key::Meta, Direction::Press)
            .map_err(|error| format!("Failed to press Command key: {error}"))?;
        enigo
            .key(Key::Unicode('c'), Direction::Click)
            .map_err(|error| format!("Failed to trigger copy: {error}"))?;
        enigo
            .key(Key::Meta, Direction::Release)
            .map_err(|error| format!("Failed to release Command key: {error}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        enigo
            .key(Key::Control, Direction::Press)
            .map_err(|error| format!("Failed to press Control key: {error}"))?;
        enigo
            .key(Key::Unicode('c'), Direction::Click)
            .map_err(|error| format!("Failed to trigger copy: {error}"))?;
        enigo
            .key(Key::Control, Direction::Release)
            .map_err(|error| format!("Failed to release Control key: {error}"))?;
    }

    Ok(())
}
