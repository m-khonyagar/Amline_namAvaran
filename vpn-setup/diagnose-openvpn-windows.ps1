<#
.SYNOPSIS
  Diagnoses Windows routing/DNS when OpenVPN (TAP/Wintun) is active.
  Optional: Run as Administrator for fullest output (some cmdlets may differ).
#>

$ErrorActionPreference = 'Continue'
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Note: not running elevated; snapshot is still useful.`n" -ForegroundColor DarkYellow
}

Write-Host "`n=== OpenVPN / routing snapshot ===" -ForegroundColor Cyan

Write-Host "`n-- IPv4 default routes & OpenVPN /1 splits (Get-NetRoute) --" -ForegroundColor Yellow
Get-NetRoute -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.DestinationPrefix -eq '0.0.0.0/0' -or
    $_.DestinationPrefix -eq '0.0.0.0/1' -or
    $_.DestinationPrefix -eq '128.0.0.0/1'
  } |
  Sort-Object RouteMetric |
  Format-Table DestinationPrefix, NextHop, InterfaceAlias, RouteMetric -AutoSize

Write-Host "`n-- DNS servers per interface --" -ForegroundColor Yellow
Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.ServerAddresses.Count -gt 0 } |
  ForEach-Object {
    $if = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
    $name = if ($if) { $if.Name } else { "ifindex $($_.InterfaceIndex)" }
    Write-Host ("  {0,-40} {1}" -f $name, ($_.ServerAddresses -join ', '))
  }

Write-Host "`n-- Adapters that look like VPN (TAP / Wintun / OpenVPN) --" -ForegroundColor Yellow
Get-NetAdapter -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match 'TAP|Wintun|OpenVPN|VPN' } |
  Format-Table Name, InterfaceDescription, Status, LinkSpeed -AutoSize

Write-Host "`n-- Test TCP to OpenAI (may fail if VPN IP is blocked) --" -ForegroundColor Yellow
$tnc = Test-NetConnection -ComputerName api.openai.com -Port 443 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
if ($tnc.TcpTestSucceeded) {
  Write-Host "  api.openai.com:443 -> OK" -ForegroundColor Green
} else {
  Write-Host "  api.openai.com:443 -> failed (PingSucceeded: $($tnc.PingSucceeded))" -ForegroundColor Red
}

Write-Host "`nDone. If ChatGPT fails only on VPN, the exit IP may be blocked by OpenAI (common for datacenter/VPN ranges)." -ForegroundColor DarkGray
Write-Host "See vpn-setup/README-OPENVPN-WINDOWS.md for fixes.`n" -ForegroundColor DarkGray
