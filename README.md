# RigStack

**One dashboard for your entire robotics ML stack.**

RigStack is a desktop application that lets robotics and ML engineers install, launch, monitor, and manage their full tool stack from a single GUI. No terminal required. It ships as a lightweight native binary (~15 MB) for Mac, Windows, and Linux.

<!-- Screenshot here -->

---

## Features

- **One-click install** -- Set up 15+ robotics and ML tools with a single click. RigStack handles package managers, Docker images, and dependencies behind the scenes.
- **Live monitoring** -- Real-time health checks and status indicators show which tools are running, stopped, or need attention.
- **Cross-platform** -- Native builds for macOS, Windows, and Linux from one codebase.
- **Curated catalog** -- Every tool manifest is authored and reviewed by the RigStack team. No arbitrary code execution.
- **Secure by design** -- All commands are validated against an allowlist in Rust before execution. Shell metacharacters are blocked. A consent dialog is shown before every install or launch.
- **Lightweight** -- ~15 MB binary, powered by Tauri 2.x. No Electron, no bundled Chromium.

## Quick Install

Download the latest release for your platform from the [Releases page](https://github.com/jdonnell96/RigStack/releases).

A CLI installer via [rigstack.dev](https://rigstack.dev) is coming soon.

## Supported Tools

| Tool | Category | Install Method |
|------|----------|----------------|
| Label Studio | Annotation | pip |
| CVAT | Annotation | Docker |
| Rerun | Visualization | pip |
| Foxglove Studio | Visualization | npm |
| Open3D | 3D Processing | pip |
| MeshLab | 3D Processing | brew / apt |
| NVIDIA Isaac Sim | Simulation | Docker |
| Gazebo | Simulation | brew / apt |
| MuJoCo | Simulation | pip |
| ROS 2 | Infrastructure | Docker / apt |
| PyTorch | Training | pip |
| Ultralytics YOLO | Training | pip |
| MLflow | Training / MLOps | pip |
| JupyterLab | Infrastructure | pip |
| Docker Desktop | Infrastructure | brew / apt / manual |

## How It Works

1. **Manifests** -- Tool definitions are JSON files that describe how to install, launch, health-check, and stop each tool. Manifests are fetched from GitHub at runtime, so the catalog can grow without app updates.
2. **Validated commands** -- Before any command runs, the Rust backend checks it against an allowlist of known package-manager prefixes (`pip install`, `docker pull`, `brew install`, etc.) and blocks shell metacharacters.
3. **Managed environments** -- pip packages are installed into a dedicated virtual environment at `~/.rigstack/venv`. npm global packages use a custom prefix at `~/.rigstack/npm-global`. Your system Python and global npm are never modified.
4. **User consent** -- A confirmation dialog shows the exact command before execution. Nothing runs without your approval.

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) 20+

### Commands

```bash
# Install frontend dependencies
npm install

# Start development server with hot reload
npm run tauri dev

# Build production binary
npm run tauri build
```

Production builds output platform-specific installers to `src-tauri/target/release/bundle/`.

## Architecture

RigStack is built with [Tauri 2.x](https://v2.tauri.app/), which pairs a Rust backend with a web-based frontend rendered through the system webview.

```
rigstack/
  src/              React 18 + TypeScript (strict) + Tailwind CSS
  src-tauri/        Rust backend (Tauri commands, security validation)
  tools/            Tool manifest JSON files
  .github/          CI/CD workflows
```

- **State management:** Zustand (single store, flat slices)
- **Styling:** Tailwind CSS (no CSS modules, no styled-components)
- **Package managers:** npm (frontend) + Cargo (Rust)
- **Tool definitions:** JSON manifests fetched from GitHub, cached locally with a 1-hour TTL

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## Links

- **Website:** [rigstack.dev](https://rigstack.dev)
- **Discord:** [discord.gg/rigstack](https://discord.gg/rigstack)
- **Twitter/X:** [@rigstack](https://twitter.com/rigstack)
- **Security:** [docs/SECURITY.md](docs/SECURITY.md)

## License

MIT -- see [LICENSE](LICENSE).
