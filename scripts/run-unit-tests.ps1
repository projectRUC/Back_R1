$ErrorActionPreference = "Stop"
$fecha    = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportes = "reportes/unitarias"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " PAEC :: Suite automatizada de pruebas unitarias" -ForegroundColor Cyan
Write-Host " Casos: CP-U-01 / CP-U-02 / CP-U-03" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $reportes | Out-Null

npm.cmd run test:ci -- --json --outputFile="$reportes/resultado_$fecha.json"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FALLO] La suite unitaria no paso." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Los 3 casos unitarios pasaron." -ForegroundColor Green
Write-Host "Cobertura: coverage/unitarias/index.html"
exit 0