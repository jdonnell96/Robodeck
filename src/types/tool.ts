export type Stage = "capture" | "annotate" | "train" | "simulate" | "infra";

export type ToolStatus =
  | "not_installed"
  | "installing"
  | "uninstalling"
  | "installed"
  | "starting"
  | "running"
  | "stopping"
  | "error"
  | "unsupported";

export type HealthCheckType = "http" | "port" | "process";

export interface HealthCheck {
  type: HealthCheckType;
  target: string;
  interval_ms: number;
}

export interface ToolManifest {
  id: string;
  name: string;
  version: string;
  category: Stage;
  description: string;
  icon: string;
  tags: string[];
  install_type: string;
  install_cmd: string;
  install_cmd_win?: string;
  install_cmd_linux?: string;
  update_cmd?: string;
  update_cmd_win?: string;
  update_cmd_linux?: string;
  version_check_cmd: string;
  launch_type: "docker" | "process" | "url";
  launch_cmd: string;
  launch_cmd_win?: string;
  stop_cmd?: string;
  stop_cmd_win?: string;
  health_check: HealthCheck;
  open_url?: string;
  docs_url: string;
  github_url?: string;
  supported_os?: string[];
}

export interface InstallLogEvent {
  tool_id: string;
  line: string;
  done: boolean;
  success: boolean;
}
