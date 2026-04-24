$headers = @{ Authorization = "Bearer sbp_588d102b90c41e7616ede64a8c604edbe3a561e1" }
$response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hosqqkeytwmksrpqyuna/api-keys" -Headers $headers
$response | ConvertTo-Json | Out-File -FilePath scratch/keys.json -Encoding utf8
