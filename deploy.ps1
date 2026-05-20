# =============================================================
# SWOT-PPG — Script de deploy para Hostinger
# Execute: clique direito > "Executar com PowerShell"
# =============================================================

$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir    = Join-Path $projectDir "dist\client"
$zipPath    = Join-Path $projectDir "deploy_hostinger.zip"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  SWOT-PPG - Preparando deploy Hostinger" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build
Write-Host "[1/3] Gerando build de producao..." -ForegroundColor Yellow
Set-Location $projectDir
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERRO no build!" -ForegroundColor Red; Read-Host; exit 1 }
Write-Host "      Build OK" -ForegroundColor Green

# 2. Criar ZIP incluindo arquivos ocultos (.htaccess)
Write-Host "[2/3] Criando pacote ZIP (com .htaccess)..." -ForegroundColor Yellow
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

Get-ChildItem -Path $distDir -Recurse -Force | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
    $relativePath = $_.FullName.Substring($distDir.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativePath) | Out-Null
}
$zip.Dispose()

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1KB)
Write-Host "      ZIP criado: deploy_hostinger.zip ($zipSize KB)" -ForegroundColor Green

# 3. Abrir pasta no Explorer
Write-Host "[3/3] Abrindo pasta para facilitar upload..." -ForegroundColor Yellow
Start-Process "explorer.exe" $projectDir

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PRONTO!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor White
Write-Host "  1. O arquivo 'deploy_hostinger.zip' foi criado na pasta do projeto"
Write-Host "  2. Acesse o hPanel da Hostinger > Gerenciador de Arquivos > public_html"
Write-Host "  3. Clique em 'Upload' e selecione o arquivo 'deploy_hostinger.zip'"
Write-Host "  4. Extraia o ZIP dentro de public_html (vai incluir o .htaccess automaticamente)"
Write-Host ""
Read-Host "Pressione Enter para fechar"
