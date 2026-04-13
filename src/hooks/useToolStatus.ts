import { useEffect, useRef } from "react";
import { useRigstackStore } from "../store/toolStore";
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
  const manifests = useRigstackStore((s) => s.manifests);
  const statuses = useRigstackStore((s) => s.statuses);
  const setToolStatus = useRigstackStore((s) => s.setToolStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (manifests.length === 0) return;

    async function pollAll() {
      const pollable = manifests.filter((m) => {
        const s = statuses[m.id];
        return (
          s !== "not_installed" &&
          s !== "unsupported" &&
          s !== "installing" &&
          s !== "uninstalling" &&
          s !== "starting" &&
          s !== "stopping" &&
          m.launch_type !== "url"
        );
      });

      await Promise.allSettled(
        pollable.map(async (manifest) => {
          const currentStatus = statuses[manifest.id];
          const healthy = await runHealthCheck(manifest);
          if (healthy && currentStatus !== "running") {
            setToolStatus(manifest.id, "running");
          } else if (!healthy && currentStatus === "running") {
            setToolStatus(manifest.id, "installed");
          }
        })
      );
    }

    intervalRef.current = setInterval(pollAll, 5000);
    pollAll();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [manifests, statuses, setToolStatus]);
}
