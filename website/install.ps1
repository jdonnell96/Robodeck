Write-Host ""
Write-Host "  RigStack Installer" -ForegroundColor Cyan
Write-Host ""

$repo = "jdonnell96/RigStack"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $release = Invoke-RestMethod -Uri $apiUrl
    $tag = $release.tag_name
} catch {
    Write-Host "  Could not fetch latest release." -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Download manually from: https://github.com/$repo/releases"
    Write-Host ""
    Write-Host "  Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    return
}

$version = $tag -replace "^v", ""
Write-Host "  Latest version: $tag"
Write-Host ""

$asset = "RigStack_${version}_x64-setup.exe"
$url = "https://github.com/$repo/releases/download/$tag/$asset"
$outPath = Join-Path $env:TEMP $asset

Write-Host "  Downloading $asset..."

try {
    Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing
} catch {
    Write-Host "  Download failed." -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  The release may not have finished building yet."
    Write-Host "  Download manually from: https://github.com/$repo/releases"
    Write-Host ""
    Write-Host "  Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    return
}

Write-Host "  Download complete. Running installer..."
Write-Host ""

try {
    Start-Process -FilePath $outPath -Wait
    Write-Host ""
    Write-Host "  Done. RigStack has been installed." -ForegroundColor Green
    Write-Host "  You can find it in your Start Menu."
} catch {
    Write-Host "  Installer failed to run." -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Try running the installer manually: $outPath"
}

Write-Host ""
Write-Host "  Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
