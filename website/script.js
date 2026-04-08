// Detect OS and update install command
(function () {
  const cmdEl = document.getElementById('install-cmd');
  const osEl = document.getElementById('install-os');
  const copyBtn = document.getElementById('copy-btn');
  const copyLabel = document.getElementById('copy-label');

  const ua = navigator.userAgent.toLowerCase();
  let os = 'linux';

  if (ua.includes('mac') || ua.includes('darwin')) {
    os = 'mac';
  } else if (ua.includes('win')) {
    os = 'windows';
  }

  const raw = 'https://raw.githubusercontent.com/jdonnell96/RigStack/main/website';
  const commands = {
    mac: `curl -fsSL ${raw}/install.sh | sh`,
    linux: `curl -fsSL ${raw}/install.sh | sh`,
    windows: `irm ${raw}/install.ps1 | iex`,
  };

  const labels = {
    mac: 'macOS',
    linux: 'Linux',
    windows: 'Windows',
  };

  cmdEl.textContent = commands[os];
  osEl.textContent = labels[os];

  // Copy to clipboard
  copyBtn.addEventListener('click', function () {
    const text = cmdEl.textContent;
    navigator.clipboard.writeText(text).then(function () {
      copyLabel.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(function () {
        copyLabel.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 2000);
    });
  });
})();
