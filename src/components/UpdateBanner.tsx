import { useState, useEffect } from "react";
import { openUrl } from "../lib/shell";

const CURRENT_VERSION = "0.1.0";
const REPO = "jdonnell96/RigStack";
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface GitHubRelease {
  tag_name: string;
  html_url: string;
}

function isNewer(remote: string, local: string): boolean {
  const r = remote.replace(/^v/, "").split(".").map(Number);
  const l = local.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

export function UpdateBanner() {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function checkForUpdate() {
      fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
        .then((res) => res.json())
        .then((data: GitHubRelease) => {
          if (data.tag_name && isNewer(data.tag_name, CURRENT_VERSION)) {
            setLatestVersion(data.tag_name);
            setReleaseUrl(data.html_url);
          }
        })
        .catch(() => {
          // Silently fail — no network or rate-limited
        });
    }

    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!latestVersion || dismissed) return null;

  return (
    <div className="mx-2 mb-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-accent">
          {latestVersion} available
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          &times;
        </button>
      </div>
      <button
        onClick={() => openUrl(releaseUrl)}
        className="mt-1 w-full text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 text-white transition-colors"
      >
        Update
      </button>
    </div>
  );
}
