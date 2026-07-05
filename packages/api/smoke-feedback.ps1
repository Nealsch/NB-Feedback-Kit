<#
.SYNOPSIS
    Smoke-test the NB-Feedback-Kit API end-to-end.
.PARAMETER WorkerUrl
    Your deployed Worker URL, e.g. https://nb-feedback-api-dev.sysadmin-d79.workers.dev
.PARAMETER ApiKey
    The API key you registered in KV (default: spherepa-beta-key).
.EXAMPLE
    .\smoke-feedback.ps1 -WorkerUrl https://nb-feedback-api-dev.sysadmin-d79.workers.dev
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$WorkerUrl,

    [Parameter(Mandatory = $false)]
    [string]$ApiKey = 'spherepa-beta-key'
)

$ErrorActionPreference = 'Stop'

# Trim trailing slashes AND stray whitespace (the most common copy/paste mistake).
$baseUrl = $WorkerUrl.Trim().TrimEnd('/')

$body = @{
    type        = 'feedback'
    title       = 'Smoke test'
    description = 'Verifying the Worker end-to-end from PowerShell smoke script'
    metadata    = @{
        application       = 'SpherePA'
        version           = 'smoke-test'
        os                = 'PowerShell script'
        screenResolution  = '0x0'
        timestamp         = (Get-Date -Format 'o')
    }
} | ConvertTo-Json -Depth 3

Write-Host ''
Write-Host "POST $baseUrl/api/feedback" -ForegroundColor Cyan
Write-Host "x-api-key: $ApiKey"
Write-Host "Body: $body"
Write-Host ''

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/api/feedback" `
        -Method Post `
        -Headers @{ 'x-api-key' = $ApiKey } `
        -ContentType 'application/json' `
        -Body $body

    Write-Host 'SUCCESS (201 Created)' -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
    Write-Host ''
    Write-Host "Check GitHub for the new issue:" -ForegroundColor Green
    Write-Host "  $($response.issueUrl)" -ForegroundColor White
}
catch {
    # PowerShell 7 wraps HTTP errors in HttpResponseMessage; read the body generically.
    $status = 0
    $errorBody = ''
    if ($_.Exception.Response) {
        try {
            $status = [int]$_.Exception.Response.StatusCode
        } catch {}
        try {
            $errorBody = $_.ErrorDetails.Message
            if ([string]::IsNullOrEmpty($errorBody) -and $_.Exception.Response.Content) {
                $errorBody = $_.Exception.Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            }
        } catch {}
    }

    if ($status -gt 0) {
        Write-Host "FAILED (HTTP $status)" -ForegroundColor Red
    } else {
        Write-Host 'FAILED (no HTTP response — likely a DNS/network error)' -ForegroundColor Red
        Write-Host "  Raw exception: $($_.Exception.Message)" -ForegroundColor Red
    }
    if ($errorBody) {
        Write-Host "Error body: $errorBody" -ForegroundColor Red
    }
}