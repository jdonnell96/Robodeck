import type { ToolManifest } from "../types/tool";

const MANIFEST_INDEX_URL =
  "https://raw.githubusercontent.com/jdonnell96/RigStack/main/tools/index.json";
const MANIFEST_BASE_URL =
  "https://raw.githubusercontent.com/jdonnell96/RigStack/main/tools/";
const CACHE_KEY = "rigstack_manifests";
const CACHE_TS_KEY = "rigstack_manifests_ts";
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function getCachedManifests(): ToolManifest[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!cached || !ts) return null;
    if (Date.now() - Number(ts) > CACHE_TTL_MS) return null;
    return JSON.parse(cached) as ToolManifest[];
  } catch {
    return null;
  }
}

function setCachedManifests(manifests: ToolManifest[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(manifests));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {
    // Storage full or unavailable — silently degrade
  }
}

function validateManifest(m: unknown): m is ToolManifest {
  if (typeof m !== "object" || m === null) return false;
  const obj = m as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    typeof obj.version === "string" &&
    typeof obj.category === "string" &&
    typeof obj.description === "string" &&
    typeof obj.install_cmd === "string" &&
    typeof obj.launch_cmd === "string" &&
    typeof obj.docs_url === "string" &&
    typeof obj.health_check === "object" &&
    obj.health_check !== null
  );
}

// Bundled manifests loaded at build time (always available as fallback)
const bundledRaw = import.meta.glob("../../tools/*.json", { eager: true });

function loadBundledManifests(): ToolManifest[] {
  return Object.entries(bundledRaw)
    .filter(([path]) => !path.endsWith("index.json"))
    .map(([, mod]) => (mod as { default: unknown }).default ?? mod)
    .filter(validateManifest);
}

export async function fetchManifests(): Promise<ToolManifest[]> {
  // Try fetching fresh from GitHub (works when repo is public)
  try {
    const indexRes = await fetch(MANIFEST_INDEX_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!indexRes.ok) throw new Error(`HTTP ${indexRes.status}`);
    const filenames: string[] = await indexRes.json();

    const results = await Promise.allSettled(
      filenames.map(async (f) => {
        const res = await fetch(`${MANIFEST_BASE_URL}${f}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
    );

    const manifests = results
      .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter(validateManifest);

    if (manifests.length > 0) {
      setCachedManifests(manifests);
      return manifests;
    }
  } catch {
    // GitHub unavailable — try cache next
  }

  // Fall back to cache
  const cached = getCachedManifests();
  if (cached && cached.length > 0) return cached;

  // Final fallback: bundled manifests (always works)
  return loadBundledManifests();
}
