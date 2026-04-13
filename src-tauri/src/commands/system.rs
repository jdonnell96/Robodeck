use std::collections::HashMap;
use std::process::Command;
use std::sync::OnceLock;

/// Detected system tools — resolved once at startup
static RESOLVED_TOOLS: OnceLock<HashMap<String, String>> = OnceLock::new();

/// Check if a binary exists on the system
fn which(bin: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new("where")
            .arg(bin)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("which")
            .arg(bin)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

/// Detect available system tools and build a resolution map.
/// e.g. "pip" -> "pip3", "python" -> "python3"
fn detect_tools() -> HashMap<String, String> {
    let mut map = HashMap::new();

    // Python resolution: python3 > python
    if which("python3") {
        map.insert("python".to_string(), "python3".to_string());
        map.insert("python3".to_string(), "python3".to_string());
    } else if which("python") {
        map.insert("python".to_string(), "python".to_string());
        map.insert("python3".to_string(), "python".to_string());
    }

    // Pip resolution: pip3 > pip > python -m pip
    if which("pip3") {
        map.insert("pip".to_string(), "pip3".to_string());
        map.insert("pip3".to_string(), "pip3".to_string());
    } else if which("pip") {
        map.insert("pip".to_string(), "pip".to_string());
        map.insert("pip3".to_string(), "pip".to_string());
    } else if let Some(py) = map.get("python").cloned() {
        // Fall back to python -m pip
        let pm = format!("{} -m pip", py);
        map.insert("pip".to_string(), pm.clone());
        map.insert("pip3".to_string(), pm);
    }

    // Docker
    if which("docker") {
        map.insert("docker".to_string(), "docker".to_string());
    }

    // Node/npm
    if which("npm") {
        map.insert("npm".to_string(), "npm".to_string());
    }

    // Brew (macOS/Linux)
    if which("brew") {
        map.insert("brew".to_string(), "brew".to_string());
    }

    // apt (Linux)
    if which("apt") {
        map.insert("apt".to_string(), "apt".to_string());
    }
    if which("apt-get") {
        map.insert("apt-get".to_string(), "apt-get".to_string());
    }

    // Git
    if which("git") {
        map.insert("git".to_string(), "git".to_string());
    }

    // Cargo
    if which("cargo") {
        map.insert("cargo".to_string(), "cargo".to_string());
    }

    map
}

fn get_tools() -> &'static HashMap<String, String> {
    RESOLVED_TOOLS.get_or_init(detect_tools)
}

/// Resolve a command by replacing the leading tool name with what's actually available.
/// e.g. "pip install foo" -> "pip3 install foo" if only pip3 exists.
pub fn resolve_command(cmd: &str) -> Result<String, String> {
    let trimmed = cmd.trim();
    let tools = get_tools();

    // Special case: "python -m pip install X" -> "{resolved_python} -m pip install X"
    if trimmed.starts_with("python -m pip") || trimmed.starts_with("python3 -m pip") {
        if let Some(py) = tools.get("python") {
            let rest = if trimmed.starts_with("python3") {
                &trimmed[7..]
            } else {
                &trimmed[6..]
            };
            return Ok(format!("{}{}", py, rest));
        }
        return Err("Python is not installed. Install Python 3 from python.org".to_string());
    }

    // Special case: "python -m module" -> "{resolved_python} -m module"
    if trimmed.starts_with("python -m ") || trimmed.starts_with("python3 -m ") {
        if let Some(py) = tools.get("python") {
            let rest = if trimmed.starts_with("python3") {
                &trimmed[7..]
            } else {
                &trimmed[6..]
            };
            return Ok(format!("{}{}", py, rest));
        }
        return Err("Python is not installed. Install Python 3 from python.org".to_string());
    }

    // Special case: "python -c" or "python3 -c"
    if trimmed.starts_with("python -c") || trimmed.starts_with("python3 -c") {
        if let Some(py) = tools.get("python") {
            let rest = if trimmed.starts_with("python3") {
                &trimmed[7..]
            } else {
                &trimmed[6..]
            };
            return Ok(format!("{}{}", py, rest));
        }
        return Err("Python is not installed.".to_string());
    }

    // General case: resolve first word
    let first_space = trimmed.find(' ').unwrap_or(trimmed.len());
    let tool_name = &trimmed[..first_space];
    let rest = &trimmed[first_space..];

    // "pip install X" -> "pip3 install X" (or "python3 -m pip install X")
    if tool_name == "pip" || tool_name == "pip3" {
        if let Some(resolved) = tools.get("pip") {
            return Ok(format!("{}{}", resolved, rest));
        }
        return Err("pip is not installed. Install Python 3 (includes pip) from python.org".to_string());
    }

    // Check if the tool exists
    if tool_name == "docker" && !tools.contains_key("docker") {
        return Err("Docker is not installed. Install Docker Desktop from docker.com".to_string());
    }
    if tool_name == "npm" && !tools.contains_key("npm") {
        return Err("npm is not installed. Install Node.js from nodejs.org".to_string());
    }
    if tool_name == "brew" && !tools.contains_key("brew") {
        return Err("Homebrew is not installed. Install from brew.sh".to_string());
    }
    if tool_name == "git" && !tools.contains_key("git") {
        return Err("git is not installed.".to_string());
    }

    // No resolution needed — return as-is
    Ok(trimmed.to_string())
}

/// Check if a tool is installed by running its version command and seeing if it exits 0.
/// Used at startup to detect tools installed outside RigStack.
#[tauri::command]
pub fn check_installed(cmd: String) -> bool {
    if cmd.is_empty() {
        return false;
    }
    let trimmed = cmd.trim();
    // Security: only allow safe version-check commands
    let allowed_prefixes = [
        "docker", "python", "python3", "pip", "pip3", "node", "npm", "git",
        "cargo", "ros2", "mlflow", "label-studio", "jupyter", "rerun",
        "foxglove-studio", "gz", "meshlab", "open3d", "yolo",
    ];
    let first_word = trimmed.split_whitespace().next().unwrap_or("");
    if !allowed_prefixes.contains(&first_word) {
        return false;
    }
    shell_exec(trimmed)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Expose detected tools to the frontend so it can show missing prerequisites
#[tauri::command]
pub fn get_system_info() -> HashMap<String, bool> {
    let tools = get_tools();
    let mut info = HashMap::new();
    for key in &["python", "pip", "docker", "npm", "brew", "git", "cargo"] {
        info.insert(key.to_string(), tools.contains_key(*key));
    }
    info
}

// --- Security validation ---

const INSTALL_PREFIXES: &[&str] = &[
    "pip install",
    "pip3 install",
    "python -m pip install",
    "python3 -m pip install",
    "docker pull",
    "docker run",
    "npm install",
    "brew install",
    "apt install",
    "apt-get install",
    "winget install",
    "git clone",
    "cargo install",
];

const OPERATION_PREFIXES: &[&str] = &[
    "docker start",
    "docker stop",
    "docker info",
    "docker ps",
    "docker --version",
    "docker version",
    "docker image inspect",
    "python -c",
    "python3 -c",
    "pip show",
    "pip3 show",
    "npm list",
    "node --version",
    "gz sim",
    "pkill",
    "kill",
    "taskkill",
    "pgrep",
    "tasklist",
    "label-studio",
    "jupyter",
    "mlflow",
    "meshlab",
    "python -m",
    "python3 -m",
    "rerun",
    "foxglove",
    "tensorboard",
    "open -a",
];

const BLOCKED_CHARS: &[&str] = &[";", "&&", "||", "|", "$(", "`", ">>", "<<", ">", "<", "\n", "\r"];

fn check_blocked_chars(cmd: &str) -> Result<(), String> {
    for blocked in BLOCKED_CHARS {
        if cmd.contains(blocked) {
            return Err(format!(
                "Blocked: command contains shell metacharacter '{}'",
                blocked
            ));
        }
    }
    Ok(())
}

pub fn validate_install_command(cmd: &str) -> Result<(), String> {
    let trimmed = cmd.trim();
    check_blocked_chars(trimmed)?;
    let is_allowed = INSTALL_PREFIXES
        .iter()
        .any(|prefix| trimmed.starts_with(prefix));
    if !is_allowed {
        return Err(format!(
            "Install command not allowed: '{}'. Must use a known package manager.",
            trimmed
        ));
    }
    Ok(())
}

pub fn validate_operation_command(cmd: &str) -> Result<(), String> {
    let trimmed = cmd.trim();
    check_blocked_chars(trimmed)?;
    let is_allowed = INSTALL_PREFIXES
        .iter()
        .chain(OPERATION_PREFIXES.iter())
        .any(|prefix| trimmed.starts_with(prefix));
    if !is_allowed {
        return Err(format!(
            "Command not allowed: '{}'. Not in the approved command list.",
            trimmed
        ));
    }
    Ok(())
}

pub fn shell_exec(cmd: &str) -> Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut c = Command::new("cmd");
        c.args(["/C", cmd]);
        c.creation_flags(CREATE_NO_WINDOW);
        c
    }
    #[cfg(not(target_os = "windows"))]
    {
        let mut c = Command::new("sh");
        c.args(["-c", cmd]);
        c
    }
}

#[tauri::command]
pub fn get_platform() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "windows"
    }
    #[cfg(target_os = "macos")]
    {
        "macos"
    }
    #[cfg(target_os = "linux")]
    {
        "linux"
    }
}
