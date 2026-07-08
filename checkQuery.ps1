$url = "https://swhgeumzceinlagtlzhm.supabase.co/rest/v1/group_requests?select=id,group_id,status,created_at,groups(name),invited_by_profile:profiles!group_requests_invited_by_fkey(full_name)"
$headers = @{
    "apikey" = "sb_publishable_mdAD1GOQDTUGMdoPzcTCgQ_rMc6RwX6"
    "Authorization" = "Bearer sb_publishable_mdAD1GOQDTUGMdoPzcTCgQ_rMc6RwX6"
}
try {
    Invoke-RestMethod -Uri $url -Headers $headers | ConvertTo-Json
} catch {
    Write-Host "Error details:"
    $_.Exception.Response | Select-Object -ExpandProperty StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
}
