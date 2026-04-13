import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ToolManifest, ToolStatus, Stage } from "../types/tool";
import type { Tier } from "../lib/tier";

interface RigstackState {
  platform: string;
  manifests: ToolManifest[];
  statuses: Record<string, ToolStatus>;
  installedVersions: Record<string, string>;
  installLogs: Record<string, string[]>;
  pids: Record<string, number>;
  search: string;
  activeStage: Stage | "all";
  dockerRunning: boolean;
  tier: Tier;
  loading: boolean;
  activeInstall: string | null;
  errors: Record<string, string | null>;
  systemInfo: Record<string, boolean>;

  setPlatform: (p: string) => void;
  setManifests: (m: ToolManifest[]) => void;
  setToolStatus: (id: string, s: ToolStatus) => void;
  setInstalledVersion: (id: string, version: string) => void;
  appendInstallLog: (id: string, line: string) => void;
  clearInstallLog: (id: string) => void;
  setPid: (id: string, pid: number) => void;
  removePid: (id: string) => void;
  setSearch: (q: string) => void;
  setActiveStage: (s: Stage | "all") => void;
  setDockerRunning: (b: boolean) => void;
  setTier: (t: Tier) => void;
  setLoading: (b: boolean) => void;
  setActiveInstall: (id: string | null) => void;
  setError: (id: string, msg: string | null) => void;
  setSystemInfo: (info: Record<string, boolean>) => void;
}

export const useRigstackStore = create<RigstackState>()(
  persist(
    (set) => ({
      platform: "unknown",
      manifests: [],
      statuses: {},
      installedVersions: {},
      installLogs: {},
      pids: {},
      search: "",
      activeStage: "all",
      dockerRunning: false,
      tier: "free",
      loading: true,
      activeInstall: null,
      errors: {},
      systemInfo: {},

      setPlatform: (p) => set({ platform: p }),
      setManifests: (m) => set({ manifests: m }),
      setToolStatus: (id, s) =>
        set((state) => ({ statuses: { ...state.statuses, [id]: s } })),
      setInstalledVersion: (id, version) =>
        set((state) => ({
          installedVersions: { ...state.installedVersions, [id]: version },
        })),
      appendInstallLog: (id, line) =>
        set((state) => ({
          installLogs: {
            ...state.installLogs,
            [id]: [...(state.installLogs[id] ?? []), line],
          },
        })),
      clearInstallLog: (id) =>
        set((state) => {
          const next = { ...state.installLogs };
          delete next[id];
          return { installLogs: next };
        }),
      setPid: (id, pid) =>
        set((state) => ({ pids: { ...state.pids, [id]: pid } })),
      removePid: (id) =>
        set((state) => {
          const next = { ...state.pids };
          delete next[id];
          return { pids: next };
        }),
      setSearch: (q) => set({ search: q }),
      setActiveStage: (s) => set({ activeStage: s }),
      setDockerRunning: (b) => set({ dockerRunning: b }),
      setTier: (t) => set({ tier: t }),
      setLoading: (b) => set({ loading: b }),
      setActiveInstall: (id) => set({ activeInstall: id }),
      setError: (id, msg) =>
        set((state) => ({ errors: { ...state.errors, [id]: msg } })),
      setSystemInfo: (info) => set({ systemInfo: info }),
    }),
    {
      name: "rigstack-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist fields that should survive restarts.
      // Ephemeral state (loading, activeInstall, logs, pids) is always reset.
      partialize: (state) => ({
        statuses: state.statuses,
        installedVersions: state.installedVersions,
        errors: state.errors,
        activeStage: state.activeStage,
      }),
    }
  )
);
