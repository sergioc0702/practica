param([switch]$NoBrowser)

$ErrorActionPreference = "Stop"
$siteRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = $null
foreach ($port in 8765..8790) {
    $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    try {
        $candidate.Start()
        $listener = $candidate
        break
    } catch [System.Net.Sockets.SocketException] {
        $candidate.Stop()
    }
}
if ($null -eq $listener) {
    throw "No se encontró un puerto local disponible entre 8765 y 8790. Cierra otras instancias de Pyme360 e inténtalo de nuevo."
}
$localPort = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$script:benchmarkCache = $null
$script:benchmarkCacheAt = $null

function Get-PublicBenchmarkResponse {
    $cacheLifetime = [TimeSpan]::FromHours(24)
    $now = [DateTimeOffset]::UtcNow
    if ($null -ne $script:benchmarkCache -and $null -ne $script:benchmarkCacheAt -and ($now - $script:benchmarkCacheAt) -lt $cacheLifetime) {
        return @{ status = "200 OK"; payload = $script:benchmarkCache }
    }

    try {
        # Solo se solicitan datos públicos del indicador ONU; nunca se adjunta información de Pyme360.
        # timePeriodStart filtra por el año exacto en esta API; se omite para obtener toda la serie.
        $apiUrl = "https://unstats.un.org/SDGAPI/v1/sdg/Series/Data?seriesCode=EG_EGY_PRIM&areaCode=1&areaCode=170&page=1&pageSize=200"
        $response = Invoke-RestMethod -Uri $apiUrl -Method Get -TimeoutSec 20 -Headers @{ Accept = "application/json" }
        $sourceRows = @()
        if ($null -ne $response.data) { $sourceRows = @($response.data) }
        elseif ($response -is [System.Array]) { $sourceRows = @($response) }

        $observations = @(
            foreach ($row in $sourceRows) {
                $areaCode = [string]$row.geoAreaCode
                if ($areaCode -notin @("1", "170")) { continue }
                $yearText = [string]$row.timePeriodStart
                if ([string]::IsNullOrWhiteSpace($yearText)) { $yearText = [string]$row.timePeriod }
                $yearMatch = [regex]::Match($yearText, "\d{4}")
                if (-not $yearMatch.Success) { continue }
                $value = [decimal]0
                if (-not [decimal]::TryParse([string]$row.value, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$value)) { continue }
                $areaName = [string]$row.geoAreaName
                if ([string]::IsNullOrWhiteSpace($areaName)) { $areaName = if ($areaCode -eq "1") { "Mundo" } else { "Colombia" } }
                [ordered]@{ areaCode = $areaCode; area = $areaName; year = [int]$yearMatch.Value; value = $value; source = [string]$row.source; basePeriod = [string]$row.basePeriod; seriesDescription = [string]$row.seriesDescription }
            }
        )

        if ($observations.Count -eq 0) { throw "La API no devolvió observaciones para el indicador solicitado." }
        $basePeriod = [string](($observations | Where-Object { -not [string]::IsNullOrWhiteSpace($_.basePeriod) } | Select-Object -First 1).basePeriod)
        $unit = "MJ por USD de PIB en PPA constante"
        if (-not [string]::IsNullOrWhiteSpace($basePeriod)) { $unit += " de $basePeriod" }
        $latestSources = @($observations | Group-Object areaCode | ForEach-Object { $_.Group | Sort-Object year -Descending | Select-Object -First 1 } | ForEach-Object { $_.source } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
        $sourceLabel = if ($latestSources.Count) { $latestSources -join "; " } else { "ONU · Base mundial de indicadores ODS" }
        $payload = [ordered]@{
            indicator = "7.3.1"
            series = "EG_EGY_PRIM"
            unit = $unit
            description = [string](($observations | Where-Object { -not [string]::IsNullOrWhiteSpace($_.seriesDescription) } | Select-Object -First 1).seriesDescription)
            source = $sourceLabel
            sourceUrl = "https://unstats.un.org/SDGAPI/swagger/"
            metadataUrl = "https://unstats.un.org/sdgs/metadata/?Goal=7&Target=7.3"
            fetchedAt = $now.ToString("o")
            stale = $false
            observations = @($observations | Sort-Object year, areaCode)
        }
        $script:benchmarkCache = $payload
        $script:benchmarkCacheAt = $now
        return @{ status = "200 OK"; payload = $payload }
    } catch {
        if ($null -ne $script:benchmarkCache) {
            $ageHours = [Math]::Max(0, [Math]::Round(($now - $script:benchmarkCacheAt).TotalHours, 1))
            $stalePayload = [ordered]@{}
            foreach ($entry in $script:benchmarkCache.GetEnumerator()) { $stalePayload[$entry.Key] = $entry.Value }
            $stalePayload.stale = $true
            $stalePayload.cacheAgeHours = $ageHours
            return @{ status = "200 OK"; payload = $stalePayload }
        }
        return @{
            status = "502 Bad Gateway"
            payload = [ordered]@{ error = "No fue posible consultar la referencia pública de la ONU."; detail = $_.Exception.Message }
        }
    }
}

Write-Host "Pyme360 está disponible en http://127.0.0.1:$localPort/index.html"
Write-Host "Solo se aceptan conexiones desde este computador. Cierra esta ventana para detenerlo."
if (-not $NoBrowser) {
    $appUrl = "http://127.0.0.1:$localPort/index.html"
    try {
        if ($env:OS -eq "Windows_NT") {
            Start-Process $appUrl
        } elseif (Test-Path -LiteralPath "/usr/bin/open") {
            & "/usr/bin/open" $appUrl
        } elseif (Get-Command "xdg-open" -ErrorAction SilentlyContinue) {
            & xdg-open $appUrl
        } else {
            Write-Host "No encontré cómo abrir el navegador automáticamente. Copia esta dirección: $appUrl"
        }
    } catch {
        Write-Host "No pude abrir el navegador automáticamente. Copia esta dirección: $appUrl"
    }
}

try {
    while ($listener.Server.IsBound) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            while ($null -ne ($header = $reader.ReadLine()) -and $header -ne "") { }
            $status = "200 OK"
            $body = [byte[]]@()
            $contentType = "application/octet-stream"
            $method = "GET"
            $urlPath = ""

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $status = "400 Bad Request"
            } else {
                $parts = $requestLine.Split(" ")
                $method = $parts[0]
                if ($method -ne "GET" -and $method -ne "HEAD") {
                    $status = "405 Method Not Allowed"
                } elseif ($parts.Length -lt 2) {
                    $status = "400 Bad Request"
                } else {
                    $urlPath = [System.Uri]::UnescapeDataString(($parts[1] -split "\?")[0]).TrimStart("/")
                    if ([string]::IsNullOrWhiteSpace($urlPath)) { $urlPath = "index.html" }
                    if ($urlPath -eq "api/v1/environment/public-benchmark") {
                        $benchmarkResult = Get-PublicBenchmarkResponse
                        $status = $benchmarkResult.status
                        $contentType = "application/json; charset=utf-8"
                        $body = [System.Text.Encoding]::UTF8.GetBytes(($benchmarkResult.payload | ConvertTo-Json -Depth 8 -Compress))
                    } else {
                        $relativePath = $urlPath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
                        $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($siteRoot, $relativePath))
                        $rootPrefix = $siteRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
                        if (-not ($filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or $filePath -eq $siteRoot)) {
                            $status = "403 Forbidden"
                        } elseif (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                            $status = "404 Not Found"
                        } else {
                            $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                            $contentType = switch ($extension) {
                                ".html" { "text/html; charset=utf-8" }
                                ".css" { "text/css; charset=utf-8" }
                                ".js" { "text/javascript; charset=utf-8" }
                                ".mjs" { "text/javascript; charset=utf-8" }
                                ".json" { "application/json; charset=utf-8" }
                                ".wasm" { "application/wasm" }
                                ".svg" { "image/svg+xml" }
                                ".png" { "image/png" }
                                ".jpg" { "image/jpeg" }
                                ".jpeg" { "image/jpeg" }
                                ".gz" { "application/gzip" }
                                default { "application/octet-stream" }
                            }
                            $body = [System.IO.File]::ReadAllBytes($filePath)
                        }
                    }
                }
            }

            if ($status -ne "200 OK" -and $contentType -notlike "application/json*") { $body = [System.Text.Encoding]::UTF8.GetBytes("Pyme360: $status") }
            $length = $body.Length
            $head = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $length`r`nCache-Control: no-store`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
            $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
            $stream.Write($headBytes, 0, $headBytes.Length)
            if ($method -ne "HEAD" -and $length -gt 0) { $stream.Write($body, 0, $length) }
            $stream.Flush()
            $reader.Dispose()
        } catch {
            Write-Host "No se pudo responder una solicitud: $($_.Exception.Message)"
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
