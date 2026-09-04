[CmdletBinding()]
param(
  [switch]$FailOnLegacy
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $root "src"
$backendRoot = Join-Path $root "backend\src"

$domains = @{
  account = @("account", "auth", "sessions", "settings")
  messages = @("messages", "calls", "presence")
  groups = @("groups")
  pages = @("company")
  admin = @("admin")
  stories = @("stories")
  network = @("connections", "network-lists", "users")
  posts = @("posts")
  reels = @("reels")
}

$backendText = (Get-ChildItem -Path $backendRoot -Filter *.js -File | Get-Content -Raw) -join "`n"
$intentionalNextRoutes = @(
  "/api/realtime",
  "/api/profile/activity",
  "/api/removed-connections",
  "/api/reels",
  "/api/stripe/checkout",
  "/api/stripe/portal"
)
$legacyFiles = Get-ChildItem -Path $sourceRoot -Recurse -Include *.js,*.jsx,*.ts,*.tsx -File |
  Where-Object { $_.FullName -notmatch "[\\/]src[\\/]app[\\/]api[\\/]" }
$legacyMatches = foreach ($file in $legacyFiles) {
  Select-String -Path $file.FullName -Pattern '/api/' | Where-Object {
    $_.Line -notmatch 'src[\\/]app[\\/]api' -and
    $_.Line -notmatch 'fetchBackendApi' -and
    $_.Line -notmatch 'backendApiUrl' -and
    $_.Line.Trim() -notmatch '^(//|/\*|\*|\*/)' -and
    $_.Line -match '(fetch\s*\(|fetch\s*`|EventSource\s*\(|\.open\s*\(\s*["''](?:GET|POST|PUT|PATCH|DELETE)["''])' -and
    $(
      $line = $_.Line
      $intentional = $false
      foreach ($route in $intentionalNextRoutes) {
        if ($line -match [regex]::Escape($route)) { $intentional = $true; break }
      }
      -not $intentional
    )
  } | ForEach-Object {
    [PSCustomObject]@{
      File = $file.FullName.Substring($root.Length + 1)
      Line = $_.LineNumber
      Value = $_.Line.Trim()
    }
  }
}

Write-Host "Backend migration audit" -ForegroundColor Cyan
Write-Host "======================="
Write-Host ""

foreach ($domain in $domains.Keys | Sort-Object) {
  $backendCovered = ($domains[$domain] | Where-Object { $backendText -match [regex]::Escape("/v1/$_") }).Count -gt 0
  $legacyCount = @($legacyMatches | Where-Object {
    $line = $_.Value
    $domains[$domain] | Where-Object { $route = $_; $line -match [regex]::Escape("/api/$route") } | Select-Object -First 1
  }).Count
  $status = if ($backendCovered -and $legacyCount -eq 0) { "MIGRE" } elseif ($backendCovered) { "PARTIEL" } else { "LEGACY" }
  $color = switch ($status) { "MIGRE" { "Green" } "PARTIEL" { "Yellow" } default { "Red" } }
  Write-Host ("{0,-12} {1,-8} appels legacy: {2}" -f $domain, $status, $legacyCount) -ForegroundColor $color
}

Write-Host ""
Write-Host "Routes legacy restantes (premiers résultats):" -ForegroundColor Yellow
$legacyMatches | Select-Object -First 40 | ForEach-Object {
  Write-Host ("  {0}:{1}  {2}" -f $_.File, $_.Line, $_.Value)
}

if ($FailOnLegacy -and $legacyMatches.Count -gt 0) {
  throw "Des appels /api restent présents. La migration n'est pas prête pour la désactivation legacy."
}
