use super::system::{shell_exec, validate_install_command};
use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use tauri::{Emitter, Window};

#[derive(Clone, Serialize)]
pub struct InstallLogEvent {
    pub tool_id: String,
    pub line: String,
    pub done: bool,
    pub success: bool,
}

fn emit_log(window: &Window, tool_id: &str, line: &str) {
    let _ = window.emit(
        "install_log",
        InstallLogEvent {
            tool_id: tool_id.to_string(),
            line: line.to_string(),
            done: false,
            success: false,
        },
    );
}

fn emit_done(window: &Window, tool_id: &str, success: bool, message: &str) {
    if !message.is_empty() {
        emit_log(window, tool_id, message);
    }
    let _ = window.emit(
        "install_log",
        InstallLogEvent {
            tool_id: tool_id.to_string(),
            line: String::new(),
            done: true,
            success,
        },
    );
}

/// Get the path to Robodeck's managed virtual environment
fn venv_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".robodeck").join("venv")
}

/// Get the pip binary inside the venv
fn venv_pip() -> String {
    let venv = venv_dir();
    #[cfg(target_os = "windows")]
    {
        venv.join("Scripts").join("pip.exe").to_string_lossy().to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        venv.join("bin").join("pip").to_string_lossy().to_string()
    }
}

/// Get the python binary inside the venv
fn venv_python() -> String {
    let venv = venv_dir();
    #[cfg(target_os = "windows")]
    {
        venv.join("Scripts").join("python.exe").to_string_lossy().to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        venv.join("bin").join("python3").to_string_lossy().to_string()
    }
}

/// Ensure the Robodeck venv exists, create it if not
fn ensure_venv(window: &Window, tool_id: &str) -> Result<(), String> {
    let venv = venv_dir();
    if venv.join("bin").exists() || venv.join("Scripts").exists() {
        return Ok(());
    }

    emit_log(window, tool_id, "Setting up Robodeck Python environment...");
    emit_log(window, tool_id, &format!("Creating venv at {}", venv.display()));

    // Create parent directory
    if let Some(parent) = venv.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // Find python3 or python
    let python = if which_exists("python3") {
        "python3"
    } else if which_exists("python") {
        "python"
    } else {
        return Err("Python is not installed. Install Python 3 from python.org".to_string());
    };

    let output = std::process::Command::new(python)
        .args(["-m", "venv", &venv.to_string_lossy()])
        .output()
        .map_err(|e| format!("Failed to create venv: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to create venv: {}", stderr));
    }

    emit_log(window, tool_id, "[OK] Python environment ready.");
    emit_log(window, tool_id, "");
    Ok(())
}

fn which_exists(bin: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("where").arg(bin).output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("which").arg(bin).output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
}

/// Rewrite a pip/python command to use the Robodeck venv
fn rewrite_for_venv(cmd: &str) -> String {
    let trimmed = cmd.trim();

    // pip install X -> /path/to/venv/bin/pip install X
    if trimmed.starts_with("pip install") || trimmed.starts_with("pip3 install") {
        let rest = if trimmed.starts_with("pip3") {
            &trimmed[4..]
        } else {
            &trimmed[3..]
        };
        return format!("{}{}", venv_pip(), rest);
    }

    // python -m pip install X -> /path/to/venv/bin/pip install X
    if trimmed.starts_with("python -m pip install") || trimmed.starts_with("python3 -m pip install") {
        let idx = trimmed.find("pip install").unwrap();
        let rest = &trimmed[idx + 3..]; // skip "pip"
        return format!("{}{}", venv_pip(), rest);
    }

    trimmed.to_string()
}

/// Rewrite a launch command to use venv python/tools
pub fn rewrite_launch_for_venv(cmd: &str) -> String {
    let trimmed = cmd.trim();
    let venv = venv_dir();

    // python -m module -> venv python -m module
    if trimmed.starts_with("python -m ") || trimmed.starts_with("python3 -m ") {
        let rest = if trimmed.starts_with("python3") {
            &trimmed[7..]
        } else {
            &trimmed[6..]
        };
        return format!("{}{}", venv_python(), rest);
    }

    // Check if the command is a tool installed in the venv bin
    let first_word = trimmed.split_whitespace().next().unwrap_or("");
    let venv_bin = {
        #[cfg(target_os = "windows")]
        { venv.join("Scripts").join(format!("{}.exe", first_word)) }
        #[cfg(not(target_os = "windows"))]
        { venv.join("bin").join(first_word) }
    };

    if venv_bin.exists() {
        let rest = &trimmed[first_word.len()..];
        return format!("{}{}", venv_bin.to_string_lossy(), rest);
    }

    trimmed.to_string()
}

/// Check if a pip package is installed in the venv
pub fn is_pip_installed_in_venv(package: &str) -> bool {
    let pip = venv_pip();
    if !std::path::Path::new(&pip).exists() {
        return false;
    }
    let output = std::process::Command::new(&pip)
        .args(["show", package])
        .output();
    match output {
        Ok(o) => o.status.success(),
        Err(_) => false,
    }
}

fn run_command_streaming(window: &Window, tool_id: &str, cmd: &str) -> Result<bool, String> {
    let mut child = shell_exec(cmd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start command: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let w1 = window.clone();
    let id1 = tool_id.to_string();
    let stdout_handle = std::thread::spawn(move || {
        if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                emit_log(&w1, &id1, &line);
            }
        }
    });

    let w2 = window.clone();
    let id2 = tool_id.to_string();
    let stderr_handle = std::thread::spawn(move || {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                emit_log(&w2, &id2, &line);
            }
        }
    });

    let status = child.wait().map_err(|e| format!("Process error: {}", e))?;
    let _ = stdout_handle.join();
    let _ = stderr_handle.join();

    Ok(status.success())
}

#[tauri::command]
pub async fn run_install(window: Window, cmd: String, tool_id: String) -> Result<(), String> {
    // Validate the original command
    if let Err(e) = validate_install_command(&cmd) {
        emit_done(&window, &tool_id, false, &format!("[ERROR] {}", e));
        return Err(e);
    }

    let is_pip = cmd.trim().starts_with("pip")
        || cmd.trim().starts_with("pip3")
        || cmd.trim().starts_with("python")
            && cmd.contains("-m pip");

    if is_pip {
        // Ensure venv exists
        if let Err(e) = ensure_venv(&window, &tool_id) {
            emit_done(&window, &tool_id, false, &format!("[ERROR] {}", e));
            return Err(e);
        }

        // Rewrite to use venv pip
        let resolved = rewrite_for_venv(&cmd);
        emit_log(&window, &tool_id, &format!("$ {}", resolved));
        emit_log(&window, &tool_id, "");

        match run_command_streaming(&window, &tool_id, &resolved) {
            Ok(true) => {
                emit_done(&window, &tool_id, true, "[OK] Install completed successfully.");
                Ok(())
            }
            Ok(false) => {
                let msg = "[FAILED] Install failed. Check the log above for details.";
                emit_done(&window, &tool_id, false, msg);
                Err(msg.to_string())
            }
            Err(e) => {
                let msg = format!("[ERROR] {}", e);
                emit_done(&window, &tool_id, false, &msg);
                Err(msg)
            }
        }
    } else {
        // Non-pip installs (docker, npm, brew, etc.) — run directly
        emit_log(&window, &tool_id, &format!("$ {}", cmd));
        emit_log(&window, &tool_id, "");

        match run_command_streaming(&window, &tool_id, &cmd) {
            Ok(true) => {
                emit_done(&window, &tool_id, true, "[OK] Install completed successfully.");
                Ok(())
            }
            Ok(false) => {
                let msg = "[FAILED] Install failed. Check the log above for details.";
                emit_done(&window, &tool_id, false, msg);
                Err(msg.to_string())
            }
            Err(e) => {
                let msg = format!("[ERROR] {}", e);
                emit_done(&window, &tool_id, false, &msg);
                Err(msg)
            }
        }
    }
}
