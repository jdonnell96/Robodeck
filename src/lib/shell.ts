import { open } from "@tauri-apps/plugin-shell";

export function openUrl(url: string) {
  open(url).catch(() => {
    // Fallback for dev mode
    window.open(url, "_blank");
  });
}
