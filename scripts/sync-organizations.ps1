# PowerShell script to sync all organizations to match standard structure
# Usage: .\scripts\sync-organizations.ps1 [orgId]

param(
    [string]$OrgId = ""
)

$SupabaseUrl = if ($env:SUPABASE_URL) { $env:SUPABASE_URL } else { "https://dcnxszcexngyghbelbrk.supabase.co" }
$SupabaseAnonKey = $env:SUPABASE_ANON_KEY

if (-not $SupabaseAnonKey) {
    Write-Host "❌ SUPABASE_ANON_KEY environment variable is not set" -ForegroundColor Red
    Write-Host "   Set it: `$env:SUPABASE_ANON_KEY='your_anon_key'" -ForegroundColor Yellow
    exit 1
}

if ($OrgId) {
    Write-Host "🔄 Syncing organization $OrgId to match standard structure..." -ForegroundColor Cyan
    $Url = "${SupabaseUrl}/functions/v1/sync-organization-structure?orgId=${OrgId}"
} else {
    Write-Host "🔄 Syncing all organizations to match standard structure..." -ForegroundColor Cyan
    $Url = "${SupabaseUrl}/functions/v1/sync-organization-structure"
}

try {
    $Headers = @{
        "Authorization" = "Bearer $SupabaseAnonKey"
        "Content-Type" = "application/json"
    }
    
    $Response = Invoke-RestMethod -Uri $Url -Method Post -Headers $Headers
    
    Write-Host ""
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $Response | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}
