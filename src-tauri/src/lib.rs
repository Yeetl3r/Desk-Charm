mod cgs;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, CheckMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_nspanel::{tauri_panel, CollectionBehavior, StyleMask, TrackingAreaOptions, WebviewWindowExt};
use tauri_plugin_autostart::ManagerExt;

#[cfg(target_os = "macos")]
tauri_panel! {
    panel!(BasicPanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true
        }
        with: {
            tracking_area: {
                options: TrackingAreaOptions::new()
                    .active_always()
                    .mouse_entered_and_exited()
                    .mouse_moved(),
                auto_resize: true
            }
        }
    })
}

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::POINT;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;


#[cfg(target_os = "macos")]
use core_graphics::event::CGEvent;

#[cfg(target_os = "macos")]
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

const HIT_RADIUS_ENTER: f64 = 42.0;
const HIT_RADIUS_EXIT: f64 = 58.0;

struct HitState {
    points: Vec<(f64, f64)>,
    force_interactive: bool,
}

type SharedHitState = Arc<Mutex<HitState>>;

#[tauri::command]
fn update_hit_points(state: tauri::State<SharedHitState>, points: Vec<(f64, f64)>) {
    let mut s = state.lock().unwrap();
    s.points = points;
}

#[tauri::command]
fn set_force_interactive(state: tauri::State<SharedHitState>, active: bool) {
    let mut s = state.lock().unwrap();
    s.force_interactive = active;
}

#[tauri::command]
fn get_stage_size(window: WebviewWindow) -> (f64, f64) {
    if let Ok(size) = window.inner_size() {
        let scale = window.scale_factor().unwrap_or(1.0);
        return (size.width as f64 / scale, size.height as f64 / scale);
    }
    if let Ok(Some(monitor)) = window.current_monitor() {
        let scale = monitor.scale_factor();
        let size = monitor.size();
        return (size.width as f64 / scale, size.height as f64 / scale);
    }
    (1280.0, 800.0)
}

#[cfg(target_os = "windows")]
fn get_cursor_pos_physical() -> Option<(f64, f64)> {
    unsafe {
        let mut point = POINT::default();
        if GetCursorPos(&mut point).is_ok() {
            Some((point.x as f64, point.y as f64))
        } else {
            None
        }
    }
}


#[cfg(target_os = "macos")]
fn get_cursor_pos_logical() -> Option<(f64, f64)> {
    // CGEvent returns coordinates in macOS logical "points" — the same
    // coordinate space as the "looks like" resolution. On Retina displays
    // CGDisplay reports points == pixels (the virtual resolution), so no
    // scaling is needed.  The hit-test loop handles the rest.
    if let Ok(source) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) {
        if let Ok(event) = CGEvent::new(source) {
            let loc = event.location();
            return Some((loc.x, loc.y));
        }
    }
    None
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn get_cursor_pos_physical() -> Option<(f64, f64)> {
    None
}

fn cover_primary_monitor(window: &WebviewWindow) {
    if let Ok(Some(monitor)) = window.current_monitor() {
        // On macOS, monitor.position() may return (0, menu_bar_height) instead
        // of (0, 0). Force the transparent overlay to start at absolute (0, 0)
        // so it covers the full screen including the menu bar area.

        #[cfg(target_os = "macos")]
        {
            let size = monitor.size();
            let pos = monitor.position();
            let _ = window.set_position(tauri::Position::Physical(
                tauri::PhysicalPosition::new(pos.x, 0),
            ));
            let _ = window.set_size(tauri::Size::Physical(
                tauri::PhysicalSize::new(size.width, size.height + pos.y as u32),
            ));
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = window.set_position(tauri::Position::Physical(*monitor.position()));
            let _ = window.set_size(tauri::Size::Physical(*monitor.size()));
        }
    }
}

// Window level elevation and space inclusion is now natively handled by tauri-nspanel

fn toggle_charm(window: &WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        cover_primary_monitor(window);
        let _ = window.show();
    }
}

fn start_hit_test_loop(app: tauri::AppHandle, state: SharedHitState) {
    thread::spawn(move || {
        let mut currently_interactive = false;
        let mut sleep_duration = 16;
        loop {
            thread::sleep(Duration::from_millis(sleep_duration));
            let Some(window) = app.get_webview_window("main") else {
                continue;
            };
            if !window.is_visible().unwrap_or(false) {
                sleep_duration = 100;
                continue;
            }

            let scale = window.scale_factor().unwrap_or(1.0);
            let window_pos = window
                .outer_position()
                .map(|p| (p.x as f64, p.y as f64))
                .unwrap_or((0.0, 0.0));

            let (force, points) = {
                let s = state.lock().unwrap();
                (s.force_interactive, s.points.clone())
            };

            // On macOS, CGEvent and outer_position() both return coordinates
            // in macOS logical "points" (the virtual/"looks like" resolution).
            // These match CSS pixels directly, so no scale division is needed.
            // On Windows, GetCursorPos returns physical pixels and
            // outer_position() returns physical pixels, so we divide by scale.

            #[cfg(target_os = "macos")]
            let cursor = get_cursor_pos_logical();
            #[cfg(target_os = "windows")]
            let cursor = get_cursor_pos_physical();
            #[cfg(not(any(target_os = "macos", target_os = "windows")))]
            let cursor = get_cursor_pos_physical();

            let mut min_dist_sq: f64 = f64::MAX;

            let near_charm = if let Some((cx, cy)) = cursor {
                // On macOS: cursor and window_pos are in logical points;
                // subtracting gives CSS-local coordinates directly.
                // On Windows: both are physical; dividing by scale gives CSS.

                #[cfg(target_os = "macos")]
                let (local_x, local_y) = (cx - window_pos.0 / scale, cy - window_pos.1 / scale);
                #[cfg(not(target_os = "macos"))]
                let (local_x, local_y) = ((cx - window_pos.0) / scale, (cy - window_pos.1) / scale);

                let radius = if currently_interactive { HIT_RADIUS_EXIT } else { HIT_RADIUS_ENTER };

                points.iter().any(|(px, py)| {
                    let dx = local_x - px;
                    let dy = local_y - py;
                    let dsq = dx * dx + dy * dy;
                    if dsq < min_dist_sq { min_dist_sq = dsq; }
                    dsq.sqrt() < radius
                })
            } else {
                false
            };

            if min_dist_sq < 25000.0 {
                sleep_duration = 16;
            } else {
                sleep_duration = 100;
            }

            let should_be_interactive = force || near_charm;
            if should_be_interactive != currently_interactive {
                let _ = window.set_ignore_cursor_events(!should_be_interactive);
                currently_interactive = should_be_interactive;
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let hit_state: SharedHitState = Arc::new(Mutex::new(HitState {
        points: Vec::new(),
        force_interactive: false,
    }));

    tauri::Builder::default()
        .manage(hit_state.clone())
        .plugin(tauri_nspanel::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            toggle_charm(&window);
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            update_hit_points,
            set_force_interactive,
            get_stage_size
        ])
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let window = app.get_webview_window("main").expect("main window must exist");
            cover_primary_monitor(&window);
            let _ = window.set_ignore_cursor_events(true);
            
            #[cfg(target_os = "macos")]
            {
                let panel = window.to_panel::<BasicPanel>().unwrap();
                
                panel.set_level(101);
                
                panel.set_style_mask(
                    StyleMask::empty()
                        .nonactivating_panel()
                        .into(),
                );
                
                panel.set_collection_behavior(
                    CollectionBehavior::new()
                        .can_join_all_spaces()
                        .stationary()
                        .ignores_cycle()
                        .full_screen_auxiliary()
                        .into(),
                );
                
                panel.set_hides_on_deactivate(false);
                panel.show();

                let ns_window = window.ns_window().unwrap() as *mut objc2::runtime::AnyObject;
                let window_number: i32 = unsafe { objc2::msg_send![ns_window, windowNumber] };
                cgs::set_sticky(window_number);
            }
            #[cfg(not(target_os = "macos"))]
            let _ = window.show();

            start_hit_test_loop(app.handle().clone(), hit_state.clone());

            let shortcut = Shortcut::new(Some(Modifiers::SHIFT | Modifiers::ALT), Code::KeyK);
            app.global_shortcut().register(shortcut)?;

            let show_hide = MenuItem::with_id(app, "toggle", "Show/Hide Charm", true, None::<&str>)?;
            let recenter = MenuItem::with_id(app, "recenter", "Move to Top Center", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            
            let charm_nazar = MenuItem::with_id(app, "charm_nazar", "🧿 Nazar Boncuğu", true, None::<&str>)?;
            let charm_hamsa = MenuItem::with_id(app, "charm_hamsa", "🪬 Hamsa", true, None::<&str>)?;
            let charm_clover = MenuItem::with_id(app, "charm_clover", "🍀 Four-Leaf Clover", true, None::<&str>)?;
            let charm_maneki_neko = MenuItem::with_id(app, "charm_maneki-neko", "🐱 Maneki-neko", true, None::<&str>)?;
            let charm_scarab = MenuItem::with_id(app, "charm_scarab", "🪲 Scarab", true, None::<&str>)?;
            let charm_ganesha = MenuItem::with_id(app, "charm_ganesha", "🐘 Ganesha", true, None::<&str>)?;
            let charm_fu = MenuItem::with_id(app, "charm_fu", "福 Fu", true, None::<&str>)?;
            let charm_nimbu = MenuItem::with_id(app, "charm_nimbu-mirchi", "🌶️🍋 Nimbu-mirchi", true, None::<&str>)?;
            let charm_drishti = MenuItem::with_id(app, "charm_drishti-bommai", "👺 Drishti bommai", true, None::<&str>)?;
            let charm_panchang = MenuItem::with_id(app, "charm_panchang-jie", "🪢 Pánchángjié", true, None::<&str>)?;
            
            let charms_menu = Submenu::with_items(
                app,
                "Charms",
                true,
                &[
                    &charm_nazar, 
                    &charm_hamsa, 
                    &charm_clover, 
                    &charm_maneki_neko, 
                    &charm_scarab, 
                    &charm_ganesha, 
                    &charm_fu, 
                    &charm_nimbu, 
                    &charm_drishti, 
                    &charm_panchang
                ],
            )?;

            let autostart_manager = app.autolaunch();
            let is_autostart = autostart_manager.is_enabled().unwrap_or(false);
            let autostart_item = CheckMenuItem::with_id(app, "autostart", "Launch at Login", true, is_autostart, None::<&str>)?;

            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let reload = MenuItem::with_id(app, "reload", "Reload Charm", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[
                &show_hide, 
                &recenter, 
                &separator, 
                &charms_menu, 
                &autostart_item,
                &reload,
                &separator, 
                &quit
            ])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("DeskCharm — Shift+Alt+K to show/hide")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            toggle_charm(&window);
                        }
                    }
                    "recenter" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("recenter", ());
                        }
                    }
                    "autostart" => {
                        let manager = app.autolaunch();
                        let is_enabled = manager.is_enabled().unwrap_or(false);
                        if is_enabled {
                            let _ = manager.disable();
                        } else {
                            let _ = manager.enable();
                        }
                    }
                    id if id.starts_with("charm_") => {
                        let charm_id = id.strip_prefix("charm_").unwrap();
                        println!("TRAY MENU CLICKED CHARM: {}", charm_id);
                        if let Err(e) = app.emit("set_charm", charm_id) {
                            println!("Failed to emit set_charm: {}", e);
                        } else {
                            println!("EMITTED to all windows: {}", charm_id);
                        }
                    }
                    "reload" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("reload_charm", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    other => {
                        println!("UNHANDLED TRAY EVENT: {}", other);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
