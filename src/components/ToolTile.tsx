import { useRigstackStore } from "../store/toolStore";
import { tauri } from "../lib/tauri";
import { openUrl } from "../lib/shell";
import type { ToolManifest, ToolStatus } from "../types/tool";
import { StatusLed } from "./StatusLed";
import { ConfirmDialog } from "./ConfirmDialog";
import { parsePrereqError } from "../lib/prereqs";
import { useState } from "react";

interface ToolTileProps {
  manifest: ToolManifest;
}

const BORDER_BY_STATUS: Record<ToolStatus, string> = {
  not_installed: "border-surface-overlay",
  installing: "border-status-blue/40",
  uninstalling: "border-status-red/30",
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
  uninstalling: "bg-surface-raised",
  installed: "bg-surface-raised",
  starting: "bg-surface-raised",
  running: "bg-[#0f1f15]",
  stopping: "bg-surface-raised",
  error: "bg-[#1f0f0f]",
  unsupported: "bg-surface-raised opacity-50",
};

export function ToolTile({ manifest }: ToolTileProps) {
  const status = useRigstackStore((s) => s.statuses[manifest.id]) ?? "not_installed";
  const platform = useRigstackStore((s) => s.platform);
  const anyInstalling = useRigstackStore((s) =>
    Object.values(s.statuses).some((st) => st === "installing" || st === "uninstalling")
  );
  const setStatus = useRigstackStore((s) => s.setToolStatus);
  const setPid = useRigstackStore((s) => s.setPid);
  const pids = useRigstackStore((s) => s.pids);
  const removePid = useRigstackStore((s) => s.removePid);
  const setActiveInstall = useRigstackStore((s) => s.setActiveInstall);
  const lastError = useRigstackStore((s) => s.errors[manifest.id]);
  const installedVersion = useRigstackStore((s) => s.installedVersions[manifest.id]);
  const setError = useRigstackStore((s) => s.setError);
  const clearInstallLog = useRigstackStore((s) => s.clearInstallLog);
  const [confirmCmd, setConfirmCmd] = useState<string | null>(null);
  const [confirmIsUpdate, setConfirmIsUpdate] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  const isInstalled = status === "installed" || status === "running";
  const hasUpdate =
    isInstalled &&
    installedVersion !== undefined &&
    manifest.version !== undefined &&
    installedVersion !== manifest.version;

  function getInstallCmd(): string {
    if (platform === "windows" && manifest.install_cmd_win) return manifest.install_cmd_win;
    if (platform === "linux" && manifest.install_cmd_linux) return manifest.install_cmd_linux;
    return manifest.install_cmd;
  }

  function getUpdateCmd(): string {
    if (platform === "windows" && manifest.update_cmd_win) return manifest.update_cmd_win;
    if (platform === "linux" && manifest.update_cmd_linux) return manifest.update_cmd_linux;
    if (manifest.update_cmd) return manifest.update_cmd;
    // Fall back to re-running install (most package managers handle upgrades)
    return getInstallCmd();
  }

  function handleUpdate() {
    setConfirmIsUpdate(true);
    setConfirmCmd(getUpdateCmd());
  }

  function getLaunchCmd(): string {
    if (platform === "windows" && manifest.launch_cmd_win) return manifest.launch_cmd_win;
    return manifest.launch_cmd;
  }

  function handleInstall() {
    setConfirmIsUpdate(false);
    setConfirmCmd(getInstallCmd());
  }

  async function executeInstall(cmd: string) {
    setConfirmCmd(null);
    setError(manifest.id, null);
    setStatus(manifest.id, "installing");
    setActiveInstall(manifest.id);
    try {
      await tauri.runInstall(cmd, manifest.id);
    } catch (e) {
      setStatus(manifest.id, "error");
      setError(manifest.id, String(e));
      setActiveInstall(manifest.id); // ensure drawer stays open to show error
    }
  }

  async function handleLaunch() {
    setError(manifest.id, null);
    setStatus(manifest.id, "starting");
    try {
      if (manifest.launch_type === "url" && manifest.open_url) {
        openUrl(manifest.open_url);
        setStatus(manifest.id, "running");
      } else {
        const cmd = getLaunchCmd();
        if (!cmd) {
          setStatus(manifest.id, "installed");
          return;
        }
        const pid = await tauri.spawnProcess(cmd);
        setPid(manifest.id, pid);
        // Health check will transition to "running"
      }
    } catch (e) {
      setStatus(manifest.id, "error");
      setError(manifest.id, `Launch failed: ${e}`);
    }
  }

  async function handleStop() {
    setError(manifest.id, null);
    setStatus(manifest.id, "stopping");
    try {
      // Try stored PID first
      const storedPid = pids[manifest.id];
      if (storedPid) {
        await tauri.killProcess(storedPid);
        removePid(manifest.id);
      }
      // Also run stop_cmd if defined (for Docker containers, etc.)
      const stopCmd = platform === "windows" ? manifest.stop_cmd_win : manifest.stop_cmd;
      if (stopCmd) {
        try {
          await tauri.spawnProcess(stopCmd);
        } catch {
          // stop_cmd failing is ok if PID kill worked
        }
      }
      setStatus(manifest.id, "installed");
    } catch (e) {
      setStatus(manifest.id, "error");
      setError(manifest.id, `Stop failed: ${e}`);
    }
  }

  async function handleUninstall() {
    setConfirmUninstall(false);
    setError(manifest.id, null);
    setStatus(manifest.id, "uninstalling");
    setActiveInstall(manifest.id);
    clearInstallLog(manifest.id);
    try {
      await tauri.runUninstall(getInstallCmd(), manifest.id);
      setStatus(manifest.id, "not_installed");
    } catch (e) {
      setStatus(manifest.id, "error");
      setError(manifest.id, String(e));
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
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white">{manifest.name}</h3>
                {hasUpdate && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-status-amber bg-status-amber/15 px-1.5 py-0.5 rounded">
                    Update
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-500">
                {installedVersion ? `v${installedVersion}` : `v${manifest.version}`} · {manifest.install_type}
              </span>
            </div>
          </div>
          <StatusLed status={status} />
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 mb-4 leading-relaxed line-clamp-2">
          {manifest.description}
        </p>

        {/* Notes */}
        {manifest.notes && (
          <div className="mb-3 px-2 py-1.5 rounded bg-status-amber/10 border border-status-amber/20">
            <p className="text-[11px] text-status-amber">{manifest.notes}</p>
          </div>
        )}

        {/* Category tag */}
        <div className="mb-3">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-surface-overlay px-2 py-0.5 rounded">
            {manifest.category}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3">
          {status === "not_installed" && (
            <ActionButton
              label="Install"
              onClick={handleInstall}
              variant="primary"
              disabled={anyInstalling}
              title={anyInstalling ? "Another install is in progress" : undefined}
            />
          )}
          {status === "installed" && (
            <>
              <ActionButton label="Launch" onClick={handleLaunch} variant="success" />
              {hasUpdate && (
                <ActionButton label="Update" onClick={handleUpdate} variant="primary" />
              )}
              <ActionButton label="Uninstall" onClick={() => setConfirmUninstall(true)} variant="danger" />
            </>
          )}
          {status === "running" && (
            <>
              {manifest.open_url && (
                <ActionButton label="Open UI" onClick={handleOpen} variant="primary" />
              )}
              {hasUpdate && (
                <ActionButton label="Update" onClick={handleUpdate} variant="default" />
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
          {(status === "installing" || status === "uninstalling" || status === "starting" || status === "stopping") && (
            <ActionButton
              label={
                status === "installing" ? "Installing..." :
                status === "uninstalling" ? "Uninstalling..." :
                status === "starting" ? "Starting..." : "Stopping..."
              }
              onClick={() => {}}
              disabled
            />
          )}
          {status === "unsupported" && (
            <span className="text-xs text-gray-600 italic">Not available on {platform}</span>
          )}
        </div>

        {/* Error message */}
        {lastError && status === "error" && (() => {
          const prereq = parsePrereqError(lastError);
          return prereq ? (
            <div className="mb-3 px-3 py-2 rounded bg-status-red/10 border border-status-red/20">
              <p className="text-[11px] font-medium text-status-red mb-1">{prereq.title}</p>
              <button
                onClick={() => openUrl(prereq.fixUrl)}
                className="text-[11px] text-accent hover:underline"
              >
                {prereq.fixLabel} →
              </button>
            </div>
          ) : (
            <div className="mb-3 px-2 py-1.5 rounded bg-status-red/10 border border-status-red/20">
              <p className="text-[11px] text-status-red break-words">{lastError}</p>
            </div>
          );
        })()}

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
          title={confirmIsUpdate ? `Update ${manifest.name}?` : `Install ${manifest.name}?`}
          command={confirmCmd}
          onConfirm={() => executeInstall(confirmCmd)}
          onCancel={() => setConfirmCmd(null)}
        />
      )}

      {confirmUninstall && (
        <ConfirmDialog
          title={`Uninstall ${manifest.name}?`}
          command={`This will remove ${manifest.name} from your system.`}
          onConfirm={handleUninstall}
          onCancel={() => setConfirmUninstall(false)}
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
  title?: string;
}

function ActionButton({ label, onClick, variant = "default", disabled = false, title }: ActionButtonProps) {
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
      title={title}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {label}
    </button>
  );
}
