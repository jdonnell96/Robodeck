export interface PrereqError {
  title: string;
  fixLabel: string;
  fixUrl: string;
}

/** Map raw error substrings to structured fix info */
const PREREQ_PATTERNS: Array<{ match: string; info: PrereqError }> = [
  {
    match: "Homebrew is not installed",
    info: { title: "Homebrew required", fixLabel: "Install Homebrew", fixUrl: "https://brew.sh" },
  },
  {
    match: "brew: command not found",
    info: { title: "Homebrew required", fixLabel: "Install Homebrew", fixUrl: "https://brew.sh" },
  },
  {
    match: "brew not found",
    info: { title: "Homebrew required", fixLabel: "Install Homebrew", fixUrl: "https://brew.sh" },
  },
  {
    match: "winget is not available",
    info: {
      title: "App Installer required",
      fixLabel: "Install from Microsoft Store",
      fixUrl: "https://apps.microsoft.com/detail/9nblggh4nns1",
    },
  },
  {
    match: "winget: command not found",
    info: {
      title: "App Installer required",
      fixLabel: "Install from Microsoft Store",
      fixUrl: "https://apps.microsoft.com/detail/9nblggh4nns1",
    },
  },
  {
    match: "apt is not available",
    info: {
      title: "apt unavailable",
      fixLabel: "Check Linux distro docs",
      fixUrl: "https://wiki.debian.org/Apt",
    },
  },
  {
    match: "Python is not installed",
    info: { title: "Python 3 required", fixLabel: "Install Python", fixUrl: "https://python.org/downloads" },
  },
  {
    match: "python: command not found",
    info: { title: "Python 3 required", fixLabel: "Install Python", fixUrl: "https://python.org/downloads" },
  },
  {
    match: "Docker is not installed",
    info: {
      title: "Docker Desktop required",
      fixLabel: "Install Docker Desktop",
      fixUrl: "https://www.docker.com/products/docker-desktop/",
    },
  },
  {
    match: "docker: command not found",
    info: {
      title: "Docker Desktop required",
      fixLabel: "Install Docker Desktop",
      fixUrl: "https://www.docker.com/products/docker-desktop/",
    },
  },
  {
    match: "npm is not installed",
    info: { title: "Node.js / npm required", fixLabel: "Install Node.js", fixUrl: "https://nodejs.org" },
  },
  {
    match: "npm: command not found",
    info: { title: "Node.js / npm required", fixLabel: "Install Node.js", fixUrl: "https://nodejs.org" },
  },
  {
    match: "git is not installed",
    info: { title: "Git required", fixLabel: "Install Git", fixUrl: "https://git-scm.com/downloads" },
  },
  {
    match: "pip.exe is not recognized",
    info: { title: "Python / pip issue", fixLabel: "Install Python", fixUrl: "https://python.org/downloads" },
  },
];

/** Parse a raw error string and return structured fix info if known, otherwise null */
export function parsePrereqError(raw: string): PrereqError | null {
  const lower = raw.toLowerCase();
  for (const { match, info } of PREREQ_PATTERNS) {
    if (lower.includes(match.toLowerCase())) return info;
  }
  return null;
}
