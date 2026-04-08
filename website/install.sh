#!/bin/sh
set -e

REPO="jdonnell96/RigStack"
LATEST=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST" ]; then
  echo "Error: Could not fetch latest release. Check https://github.com/${REPO}/releases"
  exit 1
fi

echo ""
echo "  RigStack ${LATEST}"
echo ""

OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
  Darwin)
    if [ "$ARCH" = "arm64" ]; then
      ASSET="RigStack_${LATEST#v}_aarch64.dmg"
    else
      ASSET="RigStack_${LATEST#v}_x64.dmg"
    fi
    URL="https://github.com/${REPO}/releases/download/${LATEST}/${ASSET}"
    echo "  Downloading ${ASSET}..."
    curl -fSL -o "/tmp/${ASSET}" "$URL"
    echo ""
    echo "  Opening installer..."
    open "/tmp/${ASSET}"
    echo "  Done. Drag RigStack to Applications to finish installing."
    ;;
  Linux)
    ASSET="rigstack_${LATEST#v}_amd64.AppImage"
    URL="https://github.com/${REPO}/releases/download/${LATEST}/${ASSET}"
    INSTALL_DIR="${HOME}/.local/bin"
    mkdir -p "$INSTALL_DIR"
    echo "  Downloading ${ASSET}..."
    curl -fSL -o "${INSTALL_DIR}/rigstack" "$URL"
    chmod +x "${INSTALL_DIR}/rigstack"
    echo ""
    echo "  Installed to ${INSTALL_DIR}/rigstack"
    echo "  Run 'rigstack' to launch."
    if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
      echo ""
      echo "  Note: Add ${INSTALL_DIR} to your PATH if it isn't already:"
      echo "    export PATH=\"${INSTALL_DIR}:\$PATH\""
    fi
    ;;
  *)
    echo "  Unsupported OS: ${OS}"
    echo "  Download manually from https://github.com/${REPO}/releases"
    exit 1
    ;;
esac
echo ""
