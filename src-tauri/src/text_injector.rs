use std::{thread, time::Duration};

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

        thread::sleep(Duration::from_millis(120));

        if let Some(previous) = previous {
            let _ = clipboard.set_text(previous);
        }

        Ok(())
    }
}
