$ErrorActionPreference = "Stop"

$repo = "jdonnell96/RigStack"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $release = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing
    $tag = $release.tag_name
} catch {
    Write-Host ""
    Write-Host "  Error: Could not fetch latest release."
    Write-Host "  Download manually from https://github.com/$repo/releases"
    exit 1
}

$version = $tag -replace "^v", ""
Write-Host ""
Write-Host "  RigStack $tag"
Write-Host ""

$asset = "RigStack_${version}_x64-setup.exe"
$url = "https://github.com/$repo/releases/download/$tag/$asset"
$outPath = "$env:TEMP\$asset"

Write-Host "  Downloading $asset..."
Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing

Write-Host "  Running installer..."
Start-Process -FilePath $outPath -Wait

Write-Host ""
Write-Host "  Done. RigStack has been installed."
Write-Host "  You can find it in your Start Menu."
Write-Host ""
