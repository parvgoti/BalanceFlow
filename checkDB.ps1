$url = "https://swhgeumzceinlagtlzhm.supabase.co/rest/v1/group_requests?select=*"
$headers = @{
    "apikey" = "sb_publishable_mdAD1GOQDTUGMdoPzcTCgQ_rMc6RwX6"
    "Authorization" = "Bearer sb_publishable_mdAD1GOQDTUGMdoPzcTCgQ_rMc6RwX6"
}
Invoke-RestMethod -Uri $url -Headers $headers | ConvertTo-Json
