$sql = Get-Content migration.sql -Raw
$body = @{ query = $sql } | ConvertTo-Json
$headers = @{ Authorization = "Bearer sbp_588d102b90c41e7616ede64a8c604edbe3a561e1" }
try {
    $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hosqqkeytwmksrpqyuna/database/query" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    $response | ConvertTo-Json
} catch {
    $_.Exception.Message
    $_.ErrorDetails.Message
    Write-Error $_.Exception
}
