$ErrorActionPreference = 'Stop'

$exePath = 'E:\CTO\Agent\Agent\winfsurf-20\taskflow\TaskFlowDesktop\src-tauri\target\release\taskflowdesktop.exe'
$bundledRuntimePath = 'E:\CTO\Agent\Agent\winfsurf-20\taskflow\TaskFlowDesktop\src-tauri\target\release\_up_\_up_\backend\portable_runtime\python.exe'

if (-not (Test-Path $exePath)) {
  throw "Packaged executable not found at $exePath"
}

$existing = Get-NetTCPConnection -LocalPort 8060 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  throw 'Port 8060 is already in use. Stop the running backend before smoke testing the packaged app.'
}

$proc = Start-Process -FilePath $exePath -PassThru

try {
  $healthy = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 750
    try {
      $result = Invoke-RestMethod -Uri 'http://127.0.0.1:8060/health' -TimeoutSec 2
      if ($result.status -eq 'ok') {
        $healthy = $true
        break
      }
    } catch {
      # keep polling
    }
  }

  if (-not $healthy) {
    throw 'Packaged app did not bring the backend to a healthy state within the timeout window.'
  }

  $task = Invoke-RestMethod -Uri 'http://127.0.0.1:8060/tasks' -Method Post -ContentType 'application/json' -Body '{"goal":"Packaged app smoke test"}'
  Invoke-RestMethod -Uri "http://127.0.0.1:8060/tasks/$($task.id)/run" -Method Post | Out-Null
  Start-Sleep -Seconds 2
  $detail = Invoke-RestMethod -Uri "http://127.0.0.1:8060/tasks/$($task.id)"
  $tools = Invoke-RestMethod -Uri 'http://127.0.0.1:8060/assistant/tools'
  $notificationStatus = Invoke-RestMethod -Uri 'http://127.0.0.1:8060/notifications/status'
  $notificationTest = Invoke-RestMethod -Uri 'http://127.0.0.1:8060/notifications/test' -Method Post
  $improvementStatus = Invoke-RestMethod -Uri 'http://127.0.0.1:8060/improvement/status'
  $improvementRun = Invoke-RestMethod -Uri 'http://127.0.0.1:8060/improvement/run' -Method Post
  $baleConnectorBody = @{
    enabled = $true
    config = @{
      bot_token = 'demo-bale-token'
      default_chat_id = '3001'
      allowed_chat_ids = '3001'
    }
  } | ConvertTo-Json -Compress
  $baleConnector = Invoke-RestMethod -Uri 'http://127.0.0.1:8060/assistant/connectors/bale' -Method Put -ContentType 'application/json' -Body $baleConnectorBody

  [pscustomobject]@{
    status = 'ok'
    taskId = $task.id
    taskStatus = $detail.status
    steps = $detail.steps.Count
    tools = ($tools | Select-Object -ExpandProperty id)
    notificationsEnabled = $notificationStatus.enabled
    notificationTestOk = $notificationTest.ok
    improvementEnabled = $improvementStatus.enabled
    improvementLessons = $improvementRun.lessons.Count
    baleConnector = $baleConnector.type
  } | ConvertTo-Json -Compress
}
finally {
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }

  Start-Sleep -Milliseconds 500
  $leftover = Get-NetTCPConnection -LocalPort 8060 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($processId in $leftover) {
    try {
      $child = Get-Process -Id $processId -ErrorAction Stop
      if ($bundledRuntimePath -and $child.Path -eq $bundledRuntimePath) {
        Stop-Process -Id $processId -Force
      }
    } catch {
      # Ignore processes that exit during cleanup.
    }
  }
}
