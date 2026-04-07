use super::install::rewrite_launch_for_venv;
use super::system::{shell_exec, validate_operation_command};
use std::net::TcpStream;
use std::time::Duration;

#[tauri::command]
pub async fn spawn_process(cmd: String) -> Result<u32, String> {
    validate_operation_command(&cmd)?;
    // Try venv first (for pip-installed tools), then fall back to the raw command
    let resolved = rewrite_launch_for_venv(&cmd);
    let child = shell_exec(&resolved).spawn().map_err(|e| {
        format!("Failed to start '{}': {}", resolved, e)
    })?;
    Ok(child.id())
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let output = shell_exec(&format!("taskkill /PID {} /F", pid))
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            Err(format!("Failed to kill process {}", pid))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        use std::process::Command;
        let output = Command::new("kill")
            .arg("-15")
            .arg(pid.to_string())
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            Err(format!("Failed to kill process {}", pid))
        }
    }
}

#[tauri::command]
pub async fn check_port(port: u16) -> Result<bool, String> {
    let addr = format!("127.0.0.1:{}", port);
    match TcpStream::connect_timeout(
        &addr
            .parse()
            .map_err(|e: std::net::AddrParseError| e.to_string())?,
        Duration::from_secs(2),
    ) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn check_http(url: String) -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    match client.get(&url).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub async fn check_process_name(name: String) -> Result<bool, String> {
    if !name
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '.')
    {
        return Err("Invalid process name".to_string());
    }
    #[cfg(target_os = "windows")]
    let cmd = format!("tasklist /FI \"IMAGENAME eq {}\"", name);
    #[cfg(not(target_os = "windows"))]
    let cmd = format!("pgrep -f {}", name);

    let output = shell_exec(&cmd).output().map_err(|e| e.to_string())?;
    Ok(output.status.success())
}

#[tauri::command]
pub async fn get_version(cmd: String) -> Result<Option<String>, String> {
    validate_operation_command(&cmd)?;
    let resolved = rewrite_launch_for_venv(&cmd);
    let output = shell_exec(&resolved).output().map_err(|e| e.to_string())?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            Ok(None)
        } else {
            Ok(Some(stdout))
        }
    } else {
        Ok(None)
    }
}
