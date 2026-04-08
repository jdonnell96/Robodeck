import { useState, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [version, setVersion] = useState("");
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    check()
      .then((update) => {
        if (update) {
          setUpdateAvailable(true);
          setVersion(update.version);
        }
      })
      .catch(() => {});
  }, []);

  if (!updateAvailable || dismissed) return null;

  async function handleUpdate() {
    setUpdating(true);
    try {
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch {
      setUpdating(false);
    }
  }

  return (
    <div className="mx-2 mb-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-accent">
          v{version} available
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          &times;
        </button>
      </div>
      <button
        onClick={handleUpdate}
        disabled={updating}
        className="mt-1 w-full text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 text-white transition-colors disabled:opacity-50"
      >
        {updating ? "Updating..." : "Update & Restart"}
      </button>
    </div>
  );
}
