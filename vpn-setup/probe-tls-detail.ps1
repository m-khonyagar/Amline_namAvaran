# TLS probe: TCP works but HTTPS times out — isolate proxy vs MTU vs handshake.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "=== WinINET proxy (used by many .NET apps) ===" -ForegroundColor Cyan
$p = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
Write-Host ("  ProxyEnable={0} ProxyServer={1} AutoConfigURL={2}" -f $p.ProxyEnable, $p.ProxyServer, $p.AutoConfigURL)

Write-Host "`n=== HttpWebRequest with Proxy=null ===" -ForegroundColor Cyan
try {
  $req = [System.Net.WebRequest]::CreateHttp('https://chat.openai.com/')
  $req.Proxy = $null
  $req.Timeout = 25000
  $resp = $req.GetResponse()
  Write-Host ("  chat.openai.com -> " + $resp.StatusCode)
  $resp.Close()
} catch {
  Write-Host ("  FAIL: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Host "`n=== MTU (VPN fragmentation can hang TLS) ===" -ForegroundColor Cyan
Get-NetIPInterface -AddressFamily IPv4 -ConnectionState Connected -ErrorAction SilentlyContinue |
  Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Ethernet|TAP|Wintun|OpenVPN|Local Area' } |
  Sort-Object InterfaceMetric |
  Format-Table InterfaceAlias, NlMtu, InterfaceMetric -AutoSize
