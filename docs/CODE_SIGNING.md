# Code Signing

This guide covers how to set up code signing for RigStack release builds on macOS, Windows, and Linux. It also covers Tauri updater signing, which is separate from OS-level code signing.

Without code signing, users will see security warnings on macOS and Windows that make the app appear untrustworthy. Signing is strongly recommended before any public release.

## macOS Code Signing

macOS requires both code signing and notarization for apps distributed outside the Mac App Store.

### Prerequisites

1. Enroll in the [Apple Developer Program](https://developer.apple.com) ($99/year).
2. In the Apple Developer portal, create a **Developer ID Application** certificate. This is the certificate type used for apps distributed outside the App Store.

### Exporting the Certificate

1. Open Keychain Access on your Mac.
2. Find the "Developer ID Application" certificate under **My Certificates**.
3. Right-click and choose **Export**. Save as a `.p12` file with a strong password.
4. Base64-encode the `.p12` file:
   ```bash
   base64 -i certificate.p12 -o certificate-base64.txt
   ```

### GitHub Actions Secrets

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

| Secret | Value |
|--------|-------|
| `APPLE_CERTIFICATE` | Base64-encoded contents of the `.p12` file |
| `APPLE_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `APPLE_SIGNING_IDENTITY` | Full identity string, e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Apple ID email address (used for notarization) |
| `APPLE_PASSWORD` | App-specific password generated at [appleid.apple.com](https://appleid.apple.com) -- this is not your account password |
| `APPLE_TEAM_ID` | 10-character team identifier, visible in the Apple Developer portal |

### How It Works

Tauri handles notarization automatically when these environment variables are set during the build. The `tauri build` command will sign the `.app` bundle and submit it to Apple's notarization service, then staple the notarization ticket to the binary.

### Without Signing

If these secrets are not configured, macOS will show an "unidentified developer" warning when users try to open the app. Users can bypass this by right-clicking the app and choosing **Open**, but this is a poor experience.

## Windows Code Signing

Windows uses Authenticode code signing. Without it, SmartScreen will display a "Windows protected your PC" warning that actively discourages users from running the app.

### Certificate Options

- **OV (Organization Validation) code signing certificate** from a certificate authority such as DigiCert, Sectigo, or GlobalSign. Typically costs $200-400/year. OV certificates build SmartScreen reputation immediately.
- **Azure Trusted Signing** is a newer, cheaper alternative hosted by Microsoft. It avoids the need to manage certificate files directly.

### Traditional Certificate Setup

1. Obtain an OV code signing certificate from your chosen CA.
2. Export it as a `.pfx` file with a password.
3. Base64-encode the `.pfx` file:
   ```bash
   base64 -i certificate.pfx -o certificate-base64.txt
   ```

### GitHub Actions Secrets

| Secret | Value |
|--------|-------|
| `WINDOWS_CERTIFICATE` | Base64-encoded contents of the `.pfx` file |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the `.pfx` file |

### Tauri Configuration

Add the certificate thumbprint to `tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT_HERE"
    }
  }
}
```

You can find the thumbprint by inspecting the certificate properties after importing it, or by running `certutil` on the `.pfx` file.

### Without Signing

SmartScreen will warn "Windows protected your PC" and hide the Run button behind a "More info" link. This warning persists until the binary accumulates enough download reputation, which can take weeks or months for unsigned executables.

## Linux

Linux desktop applications do not require code signing. Users install packages via their package manager or by running the binary directly, and there is no OS-level gatekeeper equivalent.

### Optional: GPG-Signed Packages

If you distribute `.deb` packages through an apt repository, you can GPG-sign them so users can verify package authenticity:

1. Generate a GPG key pair if you do not already have one.
2. Sign the repository metadata with your private key.
3. Distribute the public key so users can add it to their apt keyring.

This is only relevant if you host your own apt repository. For direct `.deb` or `.AppImage` downloads, signing is not expected.

## Tauri Updater Signing

Tauri's built-in updater uses its own signing mechanism, separate from OS code signing. This ensures that update artifacts downloaded by the app have not been tampered with.

### Generating Keys

Run the following command to generate a key pair:

```bash
npx tauri signer generate -w ~/.tauri/rigstack.key
```

This creates a private key file and outputs the corresponding public key. You will be prompted to set a password for the private key.

### GitHub Actions Secrets

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of the `.key` file |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password used during key generation |

### Tauri Configuration

Add the public key to `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

This is already configured in the RigStack release workflow. The CI build signs update artifacts automatically when the secrets are present.

## Quick Start Checklist

Follow these steps to go from unsigned to fully signed releases:

1. Enroll in the Apple Developer Program and create a Developer ID Application certificate.
2. Export the macOS certificate as `.p12`, base64-encode it, and add the six `APPLE_*` secrets to GitHub Actions.
3. Purchase a Windows OV code signing certificate (or set up Azure Trusted Signing).
4. Export the Windows certificate as `.pfx`, base64-encode it, and add the two `WINDOWS_*` secrets to GitHub Actions.
5. Add the `certificateThumbprint` to `tauri.conf.json` under `bundle.windows`.
6. Generate Tauri updater keys with `npx tauri signer generate`.
7. Add the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets to GitHub Actions.
8. Add the updater public key to `tauri.conf.json` under `plugins.updater.pubkey`.
9. Push a release and verify that the built artifacts are signed by downloading them and checking for the absence of security warnings on each platform.
