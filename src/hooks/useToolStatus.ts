import { useEffect, useRef } from "react";
import { useRobodeckStore } from "../store/toolStore";
import { tauri } from "../lib/tauri";
import type { ToolManifest } from "../types/tool";

async function runHealthCheck(manifest: ToolManifest): Promise<boolean> {
  const { health_check } = manifest;
  try {
    switch (health_check.type) {
      case "http":
        return await tauri.checkHttp(health_check.target);
      case "port":
        return await tauri.checkPort(Number(health_check.target));
      case "process":
        return await tauri.checkProcess(health_check.target);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export function useHealthCheckPoller() {
  const manifests = useRobodeckStore((s) => s.manifests);
  const statuses = useRobodeckStore((s) => s.statuses);
  const setToolStatus = useRobodeckStore((s) => s.setToolStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (manifests.length === 0) return;

    async function pollAll() {
      for (const manifest of manifests) {
        const currentStatus = statuses[manifest.id];
        // Skip tools that don't need polling
        if (
          currentStatus === "not_installed" ||
          currentStatus === "unsupported" ||
          currentStatus === "installing"
        ) {
          continue;
        }
        // URL-based tools (open in browser) — don't health check,
        // status is managed by the UI when user clicks Launch
        if (manifest.launch_type === "url") {
          continue;
        }
        const healthy = await runHealthCheck(manifest);
        if (healthy && currentStatus !== "running") {
          setToolStatus(manifest.id, "running");
        } else if (!healthy && currentStatus === "running") {
          setToolStatus(manifest.id, "installed");
        }
      }
    }

    intervalRef.current = setInterval(pollAll, 5000);
    pollAll();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [manifests, statuses, setToolStatus]);
}
