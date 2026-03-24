# Adds WinINET proxy bypass entries for OpenAI / ChatGPT (HKCU only).
# Safe for OpenVPN: does not change routes, adapters, or VPN config.
# Re-run anytime; idempotent (won't duplicate entries).

$path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
$props = Get-ItemProperty -Path $path -ErrorAction Stop
$current = [string]$props.ProxyOverride

$bypassTokens = @(
  '<local>',
  '*.openai.com',
  '*.chatgpt.com',
  'chatgpt.com',
  '*.oaistatic.com',
  '*.oaiusercontent.com',
  '*.intercom.io',
  '*.intercomcdn.com',
  '*.sentry.io',
  '*.datadoghq.com'
)

if ([string]::IsNullOrWhiteSpace($current)) {
  $merged = ($bypassTokens -join ';')
} else {
  $parts = $current.Split(';') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  $set = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($p in $parts) { [void]$set.Add($p) }
  foreach ($t in $bypassTokens) { [void]$set.Add($t) }
  $merged = ($set.ToArray() -join ';')
}

Set-ItemProperty -Path $path -Name ProxyOverride -Value $merged
Write-Host "ProxyOverride updated (ProxyEnable unchanged)." -ForegroundColor Green
Write-Host $merged
Write-Host "`nRestart ChatGPT if it was open. OpenVPN was not modified." -ForegroundColor DarkGray
