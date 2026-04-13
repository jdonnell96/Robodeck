mod commands;

use commands::{docker, install, process, system};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            system::get_platform,
            system::get_system_info,
            system::check_installed,
            docker::check_docker_running,
            docker::docker_start,
            docker::docker_stop,
            process::spawn_process,
            process::kill_process,
            process::check_port,
            process::check_http,
            process::check_process_name,
            process::get_version,
            install::run_install,
            install::run_uninstall,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
