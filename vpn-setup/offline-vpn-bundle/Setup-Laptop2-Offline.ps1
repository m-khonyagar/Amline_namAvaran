#Requires -Version 5.1
#Requires -RunAsAdministrator
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $here "Install-OnLaptop2.ps1") `
  -UninstallFirst `
  -ResetNetwork `
  -ProfileFile "vpn-bundle.ovpn" `
  -ProfileDisplayName "VPN-AutoImport" `
  -AutoConnect
