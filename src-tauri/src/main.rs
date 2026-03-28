#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_state;
mod commands;
mod providers;
mod settings;
mod text_injector;

use app_state::{AppState, load_history_from_disk, load_settings_from_disk};
use tauri::{
    Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
    image::Image,
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

const TRAY_TOGGLE_ID: &str = "toggle_main";
const TRAY_QUIT_ID: &str = "quit";

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let initial_settings = load_settings_from_disk(&handle)?;
            let initial_history =
                load_history_from_disk(&handle, &initial_settings.history_retention)?;
            app.manage(AppState::new(initial_settings.clone(), initial_history));

            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                use tauri_plugin_global_shortcut::Builder;

                app.handle().plugin(Builder::new().build())?;
                commands::register_or_replace_shortcut(
                    &handle,
                    "",
                    &initial_settings.global_hotkey,
                )?;
            }

            create_overlay_window(app)?;
            install_tray(app)?;
            wire_main_window(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            Ok(())
        })
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("TypeFree")
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::load_settings,
            commands::save_settings,
            commands::load_history,
            commands::delete_history_entry,
            commands::process_dictation,
            commands::get_overlay_state,
            commands::update_overlay_state,
            commands::show_overlay,
            commands::hide_overlay
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_overlay_window(app: &mut tauri::App) -> Result<(), String> {
    if app.get_webview_window(commands::OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    let overlay = WebviewWindowBuilder::new(
        app,
        commands::OVERLAY_LABEL,
        WebviewUrl::App("/#overlay".into()),
    )
    .title("TypeFree Overlay")
    .visible(false)
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .maximizable(false)
    .minimizable(false)
    .closable(false)
    .focused(false)
    .inner_size(240.0, 56.0)
    .shadow(false)
    .build()
    .map_err(|error| format!("Failed to create overlay window: {error}"))?;

    overlay
        .set_focusable(false)
        .map_err(|error| format!("Failed to make overlay non-focusable: {error}"))?;
    overlay
        .set_ignore_cursor_events(true)
        .map_err(|error| format!("Failed to make overlay click-through: {error}"))?;
    commands::position_overlay_window(&overlay)?;

    Ok(())
}

fn install_tray(app: &mut tauri::App) -> Result<(), String> {
    let show_hide = MenuItem::with_id(app, TRAY_TOGGLE_ID, "Show / Hide", true, None::<&str>)
        .map_err(|error| format!("Failed to create tray menu item: {error}"))?;
    let quit = MenuItem::with_id(app, TRAY_QUIT_ID, "Quit", true, None::<&str>)
        .map_err(|error| format!("Failed to create tray quit item: {error}"))?;
    let menu = MenuBuilder::new(app)
        .items(&[&show_hide, &quit])
        .build()
        .map_err(|error| format!("Failed to build tray menu: {error}"))?;

    let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))
        .map_err(|error| format!("Failed to load tray icon: {error}"))?;

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            TRAY_TOGGLE_ID => toggle_main_window(app),
            TRAY_QUIT_ID => quit_app(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)
        .map_err(|error| format!("Failed to create tray icon: {error}"))?;

    Ok(())
}

fn wire_main_window(app: &mut tauri::App) -> Result<(), String> {
    let Some(main_window) = app.get_webview_window("main") else {
        return Ok(());
    };

    let app_handle = app.handle().clone();
    main_window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            if let Some(state) = app_handle.try_state::<AppState>() {
                if !state.is_quitting() {
                    api.prevent_close();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            }
        }
    });

    Ok(())
}

fn toggle_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            _ => {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

fn quit_app<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(state) = app.try_state::<AppState>() {
        state.set_quitting(true);
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }

    if let Some(window) = app.get_webview_window(commands::OVERLAY_LABEL) {
        let _ = window.close();
    }

    app.exit(0);
}
