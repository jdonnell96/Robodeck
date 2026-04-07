import type { ToolStatus } from "../types/tool";

const LED_STYLES: Record<ToolStatus, { dot: string; label: string; text: string }> = {
  not_installed: {
    dot: "bg-gray-600",
    label: "Not Installed",
    text: "text-gray-500",
  },
  installing: {
    dot: "bg-status-blue animate-pulse",
    label: "Installing",
    text: "text-status-blue",
  },
  installed: {
    dot: "bg-status-amber",
    label: "Installed",
    text: "text-status-amber",
  },
  starting: {
    dot: "bg-status-amber animate-pulse",
    label: "Starting",
    text: "text-status-amber",
  },
  running: {
    dot: "bg-status-green animate-pulse",
    label: "Running",
    text: "text-status-green",
  },
  stopping: {
    dot: "bg-status-amber animate-pulse",
    label: "Stopping",
    text: "text-status-amber",
  },
  error: {
    dot: "bg-status-red",
    label: "Error",
    text: "text-status-red",
  },
  unsupported: {
    dot: "bg-gray-700",
    label: "Unsupported",
    text: "text-gray-600",
  },
};

interface StatusLedProps {
  status: ToolStatus;
}

export function StatusLed({ status }: StatusLedProps) {
  const style = LED_STYLES[status];
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface/60`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
      <span className={`text-[10px] font-medium uppercase tracking-wider ${style.text}`}>
        {style.label}
      </span>
    </div>
  );
}
