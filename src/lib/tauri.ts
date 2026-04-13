import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { InstallLogEvent } from "../types/tool";

export const tauri = {
  getPlatform: () => invoke<string>("get_platform"),
  dockerRunning: () => invoke<boolean>("check_docker_running"),
  dockerStart: (name: string) => invoke<void>("docker_start", { name }),
  dockerStop: (name: string) => invoke<void>("docker_stop", { name }),
  spawnProcess: (cmd: string) => invoke<number>("spawn_process", { cmd }),
  killProcess: (pid: number) => invoke<void>("kill_process", { pid }),
  checkPort: (port: number) => invoke<boolean>("check_port", { port }),
  checkHttp: (url: string) => invoke<boolean>("check_http", { url }),
  checkProcess: (name: string) => invoke<boolean>("check_process_name", { name }),
  getVersion: (cmd: string) => invoke<string | null>("get_version", { cmd }),
  runInstall: (cmd: string, toolId: string) =>
    invoke<void>("run_install", { cmd, toolId }),
  runUninstall: (installCmd: string, toolId: string) =>
    invoke<void>("run_uninstall", { installCmd, toolId }),
  getSystemInfo: () => invoke<Record<string, boolean>>("get_system_info"),
  checkInstalled: (cmd: string) => invoke<boolean>("check_installed", { cmd }),
  onInstallLog: (cb: (e: InstallLogEvent) => void): Promise<UnlistenFn> =>
    listen<InstallLogEvent>("install_log", (e) => cb(e.payload)),
};
