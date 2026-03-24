# Read-only probes; does not modify routes or VPN.
$ErrorActionPreference = 'Continue'
Write-Host "`n=== DNS (system resolver) ===" -ForegroundColor Cyan
foreach ($name in @('api.openai.com', 'chat.openai.com', 'auth.openai.com', 'ab.chatgpt.com', 'browser-intake-datadoghq.com')) {
  try {
    $addrs = [System.Net.Dns]::GetHostAddresses($name) | ForEach-Object { $_.ToString() }
    Write-Host ("  {0,-30} {1}" -f $name, ($addrs -join ', '))
  } catch {
    Write-Host ("  {0,-30} FAIL: {1}" -f $name, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host "`n=== TCP 443 ===" -ForegroundColor Cyan
foreach ($h in @('api.openai.com', 'chat.openai.com')) {
  $t = Test-NetConnection -ComputerName $h -Port 443 -WarningAction SilentlyContinue
  Write-Host ("  {0,-25} TcpTestSucceeded={1}" -f $h, $t.TcpTestSucceeded)
}

Write-Host "`n=== HTTPS HEAD ===" -ForegroundColor Cyan
foreach ($url in @('https://api.openai.com/', 'https://chat.openai.com/')) {
  try {
    $r = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
    Write-Host ("  {0} -> {1}" -f $url, $r.StatusCode)
  } catch {
    Write-Host ("  {0} -> {1}" -f $url, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host "`n=== IPv6 default routes (if any bypass VPN, apps may break) ===" -ForegroundColor Cyan
Get-NetRoute -AddressFamily IPv6 -ErrorAction SilentlyContinue |
  Where-Object { $_.DestinationPrefix -eq '::/0' } |
  Format-Table DestinationPrefix, NextHop, InterfaceAlias, RouteMetric -AutoSize

Write-Host "`n=== HttpWebRequest (full .NET stack, like many desktop apps) ===" -ForegroundColor Cyan
foreach ($url in @('https://chat.openai.com/', 'https://api.openai.com/')) {
  try {
    $req = [System.Net.WebRequest]::CreateHttp($url)
    $req.Timeout = 20000
    $req.Method = 'GET'
    $resp = $req.GetResponse()
    Write-Host ("  {0} -> {1}" -f $url, $resp.StatusCode)
    $resp.Close()
  } catch {
    Write-Host ("  {0} -> {1}" -f $url, $_.Exception.Message) -ForegroundColor Red
  }
}

Write-Host "`n=== TLS 1.2 explicit (ServicePointManager) ===" -ForegroundColor Cyan
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $req = [System.Net.WebRequest]::CreateHttp('https://chat.openai.com/')
  $req.Timeout = 20000
  $resp = $req.GetResponse()
  Write-Host ('  chat.openai.com -> ' + $resp.StatusCode)
  $resp.Close()
} catch {
  Write-Host ('  FAIL: ' + $_.Exception.Message) -ForegroundColor Red
}
