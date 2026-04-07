import { useRobodeckStore } from "../store/toolStore";
import { tauri } from "../lib/tauri";
import { openUrl } from "../lib/shell";
import type { ToolManifest, ToolStatus } from "../types/tool";
import { StatusLed } from "./StatusLed";
import { ConfirmDialog } from "./ConfirmDialog";
import { useState } from "react";

interface ToolTileProps {
  manifest: ToolManifest;
}

const BORDER_BY_STATUS: Record<ToolStatus, string> = {
  not_installed: "border-surface-overlay",
  installing: "border-status-blue/40",
  installed: "border-status-amber/30",
  starting: "border-status-amber/30",
  running: "border-status-green/40",
  stopping: "border-status-amber/30",
  error: "border-status-red/40",
  unsupported: "border-surface-overlay",
};

const BG_BY_STATUS: Record<ToolStatus, string> = {
  not_installed: "bg-surface-raised",
  installing: "bg-surface-raised",
  installed: "bg-surface-raised",
  starting: "bg-surface-raised",
  running: "bg-[#0f1f15]",
  stopping: "bg-surface-raised",
  error: "bg-[#1f0f0f]",
  unsupported: "bg-surface-raised opacity-50",
};

export function ToolTile({ manifest }: ToolTileProps) {
  const status = useRobodeckStore((s) => s.statuses[manifest.id]) ?? "not_installed";
  const platform = useRobodeckStore((s) => s.platform);
  const setStatus = useRobodeckStore((s) => s.setToolStatus);
  const setPid = useRobodeckStore((s) => s.setPid);
  const setActiveInstall = useRobodeckStore((s) => s.setActiveInstall);
  const [confirmCmd, setConfirmCmd] = useState<string | null>(null);

  function getInstallCmd(): string {
    if (platform === "windows" && manifest.install_cmd_win) return manifest.install_cmd_win;
    if (platform === "linux" && manifest.install_cmd_linux) return manifest.install_cmd_linux;
    return manifest.install_cmd;
  }

  function getLaunchCmd(): string {
    if (platform === "windows" && manifest.launch_cmd_win) return manifest.launch_cmd_win;
    return manifest.launch_cmd;
  }

  function handleInstall() {
    setConfirmCmd(getInstallCmd());
  }

  async function executeInstall(cmd: string) {
    setConfirmCmd(null);
    setStatus(manifest.id, "installing");
    setActiveInstall(manifest.id);
    try {
      await tauri.runInstall(cmd, manifest.id);
    } catch {
      setStatus(manifest.id, "error");
    }
  }

  async function handleLaunch() {
    setStatus(manifest.id, "starting");
    try {
      if (manifest.launch_type === "url" && manifest.open_url) {
        openUrl(manifest.open_url);
        setStatus(manifest.id, "running");
      } else {
        const pid = await tauri.spawnProcess(getLaunchCmd());
        setPid(manifest.id, pid);
      }
    } catch {
      setStatus(manifest.id, "error");
    }
  }

  async function handleStop() {
    setStatus(manifest.id, "stopping");
    try {
      const stopCmd = platform === "windows" ? manifest.stop_cmd_win : manifest.stop_cmd;
      if (stopCmd) {
        await tauri.spawnProcess(stopCmd);
      }
      setStatus(manifest.id, "installed");
    } catch {
      setStatus(manifest.id, "error");
    }
  }

  function handleOpen() {
    if (manifest.open_url) openUrl(manifest.open_url);
  }

  function handleDocs() {
    openUrl(manifest.docs_url);
  }

  function handleGithub() {
    if (manifest.github_url) openUrl(manifest.github_url);
  }

  return (
    <>
      <div className={`rounded-xl p-4 border transition-colors ${BORDER_BY_STATUS[status]} ${BG_BY_STATUS[status]}`}>
        {/* Header: icon + name + status badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center text-lg font-bold text-accent">
              {manifest.name[0]}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">{manifest.name}</h3>
              <span className="text-[11px] text-gray-500">v{manifest.version} · {manifest.install_type}</span>
            </div>
          </div>
          <StatusLed status={status} />
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 mb-4 leading-relaxed line-clamp-2">
          {manifest.description}
        </p>

        {/* Category tag */}
        <div className="mb-3">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-surface-overlay px-2 py-0.5 rounded">
            {manifest.category}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3">
          {status === "not_installed" && (
            <ActionButton label="Install" onClick={handleInstall} variant="primary" />
          )}
          {status === "installed" && (
            <ActionButton label="Launch" onClick={handleLaunch} variant="success" />
          )}
          {status === "running" && (
            <>
              {manifest.open_url && (
                <ActionButton label="Open UI" onClick={handleOpen} variant="primary" />
              )}
              <ActionButton label="Stop" onClick={handleStop} variant="danger" />
            </>
          )}
          {status === "error" && (
            <>
              <ActionButton label="Retry Install" onClick={handleInstall} variant="primary" />
              <ActionButton
                label="View Log"
                onClick={() => setActiveInstall(manifest.id)}
                variant="default"
              />
            </>
          )}
          {(status === "installing" || status === "starting" || status === "stopping") && (
            <ActionButton label={status === "installing" ? "Installing..." : status === "starting" ? "Starting..." : "Stopping..."} onClick={() => {}} disabled />
          )}
          {status === "unsupported" && (
            <span className="text-xs text-gray-600 italic">Not available on {platform}</span>
          )}
        </div>

        {/* Links row */}
        <div className="flex items-center gap-3 pt-2 border-t border-surface-overlay/50">
          <button onClick={handleDocs} className="text-[11px] text-gray-500 hover:text-accent transition-colors">
            Docs
          </button>
          {manifest.github_url && (
            <button onClick={handleGithub} className="text-[11px] text-gray-500 hover:text-accent transition-colors">
              GitHub
            </button>
          )}
          {status !== "not_installed" && status !== "unsupported" && (
            <button
              onClick={() => setActiveInstall(manifest.id)}
              className="text-[11px] text-gray-500 hover:text-accent transition-colors ml-auto"
            >
              Logs
            </button>
          )}
        </div>
      </div>

      {confirmCmd && (
        <ConfirmDialog
          title={`Install ${manifest.name}?`}
          command={confirmCmd}
          onConfirm={() => executeInstall(confirmCmd)}
          onCancel={() => setConfirmCmd(null)}
        />
      )}
    </>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "success" | "danger";
  disabled?: boolean;
}

function ActionButton({ label, onClick, variant = "default", disabled = false }: ActionButtonProps) {
  const styles = {
    default: "bg-surface-overlay hover:bg-surface-overlay/80 text-gray-300",
    primary: "bg-accent hover:bg-accent-hover text-white",
    success: "bg-status-green/20 hover:bg-status-green/30 text-status-green border border-status-green/30",
    danger: "bg-status-red/15 hover:bg-status-red/25 text-status-red border border-status-red/20",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {label}
    </button>
  );
}
