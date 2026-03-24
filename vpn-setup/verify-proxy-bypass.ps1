[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$req = [System.Net.WebRequest]::CreateHttp('https://chat.openai.com/')
$req.Timeout = 25000
$req.AllowAutoRedirect = $false
try {
  $resp = $req.GetResponse()
  Write-Host "OK Status:" $resp.StatusCode
  $resp.Close()
} catch {
  $r = $_.Exception.Response
  if ($r) {
    Write-Host "OK (redirect/error response) Status:" $r.StatusCode
    $r.Close()
  } else {
    Write-Host "FAIL:" $_.Exception.Message -ForegroundColor Red
    exit 1
  }
}
