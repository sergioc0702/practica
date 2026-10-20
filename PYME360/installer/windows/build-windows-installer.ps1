$ErrorActionPreference = 'Stop'

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$sourceScript = Join-Path $PSScriptRoot 'Instalar-Python-Pyme360.cmd'
$outputExe = Join-Path $projectRoot 'Instalar-Python-Pyme360.exe'
$iexpress = Join-Path $env:WINDIR 'System32\iexpress.exe'
$tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
$buildDir = Join-Path $tempRoot ('pyme360-iexpress-' + [guid]::NewGuid().ToString('N'))
$packageDir = Join-Path $buildDir 'payload'
$sedPath = Join-Path $buildDir 'Pyme360.sed'

if (-not (Test-Path -LiteralPath $iexpress)) {
    throw 'No se encontro IExpress, la herramienta incluida con Windows para crear paquetes autoextraibles.'
}
if (-not (Test-Path -LiteralPath $sourceScript)) {
    throw 'No se encontro Instalar-Python-Pyme360.cmd.'
}

New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
Copy-Item -LiteralPath $sourceScript -Destination (Join-Path $packageDir 'Instalar-Python-Pyme360.cmd')

$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=1
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=
FinishMessage=%FinishMessage%
TargetName=$outputExe
FriendlyName=%FriendlyName%
AppLaunched=Instalar-Python-Pyme360.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
InstallPrompt=Este asistente comprobara Python y te ofrecera instalarlo para Pyme360.
FinishMessage=Asistente de Python para Pyme360 finalizado.
FriendlyName=Preparar Python para Pyme360
FILE0="Instalar-Python-Pyme360.cmd"
[SourceFiles]
SourceFiles0=$packageDir
[SourceFiles0]
%FILE0%=
"@

Set-Content -LiteralPath $sedPath -Value $sed -Encoding Default
try {
    $process = Start-Process -FilePath $iexpress -ArgumentList @('/N', '/Q', '/M', $sedPath) -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "IExpress termino con codigo $($process.ExitCode)."
    }
    if (-not (Test-Path -LiteralPath $outputExe)) {
        throw 'IExpress termino sin crear el ejecutable esperado.'
    }
    Write-Output "Ejecutable creado: $outputExe"
}
finally {
    $resolvedBuildDir = [IO.Path]::GetFullPath($buildDir)
    if ($resolvedBuildDir.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedBuildDir).StartsWith('pyme360-iexpress-', [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedBuildDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
