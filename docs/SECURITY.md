# Security Model

Robodeck executes shell commands on your machine to install and launch developer tools. This document explains the safeguards in place to prevent misuse.

## Curated Catalog

Every tool manifest is authored by the Robodeck team. There is no user-submitted or third-party manifest pipeline. Manifests are fetched from a known GitHub repository and define the exact commands that Robodeck is allowed to run for each tool.

## Command Allowlist

Before any command is executed, the Rust backend validates it against a strict allowlist of known prefixes. Commands that do not match a recognized prefix are rejected.

**Install prefixes:**

- `pip install` / `pip3 install`
- `python -m pip install` / `python3 -m pip install`
- `docker pull` / `docker run`
- `npm install`
- `brew install`
- `apt install` / `apt-get install`
- `git clone`
- `cargo install`

**Operation prefixes** (launch, health check, stop):

- `docker start` / `docker stop` / `docker info` / `docker ps` / `docker --version` / `docker version` / `docker image inspect`
- `python -c` / `python3 -c` / `python -m` / `python3 -m`
- `pip show` / `pip3 show`
- `npm list` / `node --version`
- `gz sim`
- `pkill` / `kill` / `pgrep` (process management)
- `taskkill` / `tasklist` (Windows process management)
- Tool-specific launchers: `label-studio`, `jupyter`, `mlflow`, `meshlab`, `rerun`, `foxglove`, `tensorboard`
- `open -a` (macOS application launcher)

Any command that does not start with one of these prefixes is blocked.

## Shell Metacharacter Blocking

All commands are scanned for dangerous shell metacharacters before execution. The following are blocked:

- `;` -- command chaining
- `&&` and `||` -- conditional execution
- `|` -- piping
- `$(` and backticks -- command substitution
- `>>` and `<<` -- redirection
- `\n` and `\r` -- newline injection

If any of these characters are found in a command string, execution is refused.

## User Consent Dialogs

Robodeck shows the exact command it intends to run in a confirmation dialog before execution. No install, launch, or stop command runs without explicit user approval. The streaming log output displays the resolved command so you can verify what actually executed.

## Managed Environments

Robodeck never modifies your system Python installation or global npm packages.

- **Python packages** are installed into a dedicated virtual environment at `~/.robodeck/venv`. The venv is created automatically on first use.
- **npm global packages** are installed with a custom prefix at `~/.robodeck/npm-global`, keeping your system npm prefix untouched.

This isolation avoids conflicts with system packages and works around PEP 668 restrictions on externally-managed Python environments.

## Content Security Policy

The Tauri webview enforces a strict CSP:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://raw.githubusercontent.com https://api.github.com https://registry.robodeck.dev;
img-src 'self' data: https:
```

- Scripts can only load from the app bundle itself.
- Network requests are limited to GitHub (for manifest fetching) and the Robodeck registry.
- No inline scripts are permitted.

## Platform Branching

All platform-specific logic (shell execution, binary resolution, path construction) is isolated in `src-tauri/src/commands/system.rs`. On Windows, commands run via `cmd /C`; on macOS and Linux, via `sh -c`. Binary lookups use `where` on Windows and `which` on Unix systems.

## Reporting Vulnerabilities

If you discover a security vulnerability in Robodeck, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Email **security@robodeck.dev** with a description of the vulnerability, steps to reproduce, and any relevant details.
3. We will acknowledge your report within 48 hours and provide a timeline for a fix.

We appreciate responsible disclosure and will credit reporters (with permission) in release notes.
