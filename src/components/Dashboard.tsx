import { useEffect, useMemo, useRef } from "react";
import { useRigstackStore } from "../store/toolStore";
import { useHealthCheckPoller } from "../hooks/useToolStatus";
import { useDockerPoller } from "../hooks/useDockerStatus";
import { StageFilter } from "./StageFilter";
import { SearchBar } from "./SearchBar";
import { DockerStatus } from "./DockerStatus";
import { SidebarLinks } from "./SidebarLinks";
import { UpdateBanner } from "./UpdateBanner";
import { ToolTile } from "./ToolTile";
import { InstallDrawer } from "./InstallDrawer";
import { EmptyState } from "./EmptyState";
import { tauri } from "../lib/tauri";

export function Dashboard() {
  const manifests = useRigstackStore((s) => s.manifests);
  const search = useRigstackStore((s) => s.search);
  const activeStage = useRigstackStore((s) => s.activeStage);
  const platform = useRigstackStore((s) => s.platform);
  const loading = useRigstackStore((s) => s.loading);
  const statuses = useRigstackStore((s) => s.statuses);
  const setToolStatus = useRigstackStore((s) => s.setToolStatus);
  const setInstalledVersion = useRigstackStore((s) => s.setInstalledVersion);
  const scannedRef = useRef(false);

  useHealthCheckPoller();
  useDockerPoller();

  // Mark unsupported tools and initialize status for new tools not in persisted state
  useEffect(() => {
    for (const m of manifests) {
      if (m.supported_os && !m.supported_os.includes(platform)) {
        if (statuses[m.id] !== "unsupported") {
          setToolStatus(m.id, "unsupported");
        }
      } else if (!statuses[m.id]) {
        setToolStatus(m.id, "not_installed");
      }
    }
  }, [manifests, platform, statuses, setToolStatus]);

  // Startup scan: detect tools installed outside RigStack (runs once per session)
  useEffect(() => {
    if (manifests.length === 0 || scannedRef.current) return;
    scannedRef.current = true;

    async function scanInstalled() {
      const scannable = manifests.filter(
        (m) =>
          m.version_check_cmd &&
          !(m.supported_os && !m.supported_os.includes(platform))
      );

      await Promise.allSettled(
        scannable.map(async (m) => {
          try {
            // Use platform-specific version check command if available
            const cmd =
              (platform === "windows" && m.version_check_cmd_win) ||
              (platform === "linux" && m.version_check_cmd_linux) ||
              m.version_check_cmd;
            const version = await tauri.getVersion(cmd);
            const current = statuses[m.id];
            if (version !== null && version !== undefined) {
              if (current === "not_installed" || current === undefined) {
                setToolStatus(m.id, "installed");
              }
              setInstalledVersion(m.id, version);
            } else if (current === undefined) {
              setToolStatus(m.id, "not_installed");
            }
          } catch {
            // Tool not found — leave status as-is
          }
        })
      );
    }

    scanInstalled();
  }, [manifests, platform]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(
    () =>
      manifests.filter((m) => {
        if (activeStage !== "all" && m.category !== activeStage) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      }),
    [manifests, activeStage, search]
  );

  const errors = useRigstackStore((s) => s.errors);

  // Summary counts
  const counts = useMemo(() => {
    const vals = Object.values(statuses);
    const errCount = Object.values(errors).filter(Boolean).length;
    return {
      running: vals.filter((s) => s === "running").length,
      installed: vals.filter((s) => s === "installed").length,
      installing: vals.filter((s) => s === "installing").length,
      errors: errCount,
    };
  }, [statuses, errors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400 text-lg">Loading tools...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r border-surface-overlay flex flex-col p-4 gap-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">R</div>
          <div className="text-xl font-bold tracking-tight">RigStack</div>
        </div>

        {/* Status summary */}
        <div className="flex flex-wrap gap-1.5 text-[11px] mb-2">
          {counts.running > 0 && (
            <span className="text-status-green bg-status-green/10 px-2 py-0.5 rounded-full">
              {counts.running} running
            </span>
          )}
          {counts.installed > 0 && (
            <span className="text-status-amber bg-status-amber/10 px-2 py-0.5 rounded-full">
              {counts.installed} ready
            </span>
          )}
          {counts.installing > 0 && (
            <span className="text-status-blue bg-status-blue/10 px-2 py-0.5 rounded-full">
              {counts.installing} installing
            </span>
          )}
          {counts.errors > 0 && (
            <span className="text-status-red bg-status-red/10 px-2 py-0.5 rounded-full">
              {counts.errors} error{counts.errors !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <StageFilter />
        <div className="mt-auto flex flex-col gap-3">
          <UpdateBanner />
          <SidebarLinks />
          <DockerStatus />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-surface-overlay">
          <SearchBar />
          <div className="text-sm text-gray-500 whitespace-nowrap">
            {filtered.length} tool{filtered.length !== 1 ? "s" : ""}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((m) => (
                <ToolTile key={m.id} manifest={m} />
              ))}
            </div>
          )}
        </div>
      </main>

      <InstallDrawer />
    </div>
  );
}
