$ErrorActionPreference = 'Stop'

$backendRoot = 'E:\CTO\Agent\Agent\winfsurf-20\taskflow\backend'
$desktopRoot = 'E:\CTO\Agent\Agent\winfsurf-20\taskflow\TaskFlowDesktop'
$pythonExe = Join-Path $backendRoot '.venv\Scripts\python.exe'
$workspaceRoot = 'E:\CTO\Agent\Agent\winfsurf-20\taskflow\workspace'
$testWorkspace = Join-Path $workspaceRoot 'verification-workspace'
$baseUrl = 'http://127.0.0.1:8060'

function Wait-ForHealth {
  param([int]$Attempts = 30, [int]$DelayMs = 500)
  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      $health = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 2
      if ($health.status -eq 'ok') {
        return $true
      }
    } catch {}
    Start-Sleep -Milliseconds $DelayMs
  }
  return $false
}

function Wait-ForTaskCompletion {
  param([string]$TaskId, [int]$Attempts = 20, [int]$DelayMs = 700)
  for ($i = 0; $i -lt $Attempts; $i++) {
    $task = Invoke-RestMethod -Uri "$baseUrl/tasks/$TaskId"
    if ($task.status -in @('succeeded', 'failed', 'cancelled')) {
      return $task
    }
    Start-Sleep -Milliseconds $DelayMs
  }
  return Invoke-RestMethod -Uri "$baseUrl/tasks/$TaskId"
}

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) {
    throw $Message
  }
}

$existing = Get-NetTCPConnection -LocalPort 8060 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  throw 'Port 8060 is already in use. Stop the running backend before verification.'
}

New-Item -ItemType Directory -Force -Path $testWorkspace | Out-Null
$sampleFile = Join-Path $testWorkspace 'verification-upload.txt'
Set-Content -Path $sampleFile -Value 'verification upload sample'

$proc = Start-Process -FilePath $pythonExe -ArgumentList @('-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8060') -WorkingDirectory $backendRoot -PassThru
$settingsBefore = $null

try {
  Assert-True (Wait-ForHealth) 'Backend did not become healthy.'

  $settingsBefore = Invoke-RestMethod -Uri "$baseUrl/settings"
  $updatedSettings = Invoke-RestMethod -Uri "$baseUrl/settings" -Method Put -ContentType 'application/json' -Body (@{
    workspacePath = $testWorkspace
    safetyMode = 'standard'
    preferredModel = 'Local executor'
  } | ConvertTo-Json -Compress)
  Assert-True ($updatedSettings.workspacePath -eq $testWorkspace) 'Settings update did not persist workspacePath.'

  $task = Invoke-RestMethod -Uri "$baseUrl/tasks" -Method Post -ContentType 'application/json' -Body '{"goal":"Verification workflow end-to-end"}'
  $planned = Invoke-RestMethod -Uri "$baseUrl/tasks/$($task.id)/plan" -Method Post
  Assert-True ($planned.steps.Count -ge 3) 'Task planning did not produce the expected steps.'
  Invoke-RestMethod -Uri "$baseUrl/tasks/$($task.id)/run" -Method Post | Out-Null
  $completedTask = Wait-ForTaskCompletion -TaskId $task.id
  Assert-True ($completedTask.status -eq 'succeeded') 'End-to-end workflow did not complete successfully.'
  $events = Invoke-RestMethod -Uri "$baseUrl/tasks/$($task.id)/events"
  $taskArtifacts = Invoke-RestMethod -Uri "$baseUrl/tasks/$($task.id)/artifacts"
  Assert-True ($events.Count -gt 0) 'Task events were not recorded.'
  Assert-True ($taskArtifacts.Count -gt 0) 'Task artifacts were not produced.'
  $artifactDetail = Invoke-RestMethod -Uri "$baseUrl/artifacts/$($taskArtifacts[0].id)"
  Assert-True ($artifactDetail.size -ge 0) 'Artifact detail endpoint did not respond correctly.'

  $memory = Invoke-RestMethod -Uri "$baseUrl/memory/list?limit=10"
  $agents = Invoke-RestMethod -Uri "$baseUrl/agents"
  Assert-True ($memory.Count -ge 1) 'Memory endpoint returned no items.'
  Assert-True ($agents.Count -ge 3) 'Agents endpoint returned too few workflow roles.'

  $tools = Invoke-RestMethod -Uri "$baseUrl/assistant/tools"
  Assert-True (($tools | Select-Object -ExpandProperty id) -contains 'telegram') 'Assistant tools are missing Telegram.'
  Assert-True (($tools | Select-Object -ExpandProperty id) -contains 'bale') 'Assistant tools are missing Bale.'
  Assert-True (($tools | Select-Object -ExpandProperty id) -contains 'notification') 'Assistant tools are missing Notification.'

  $gmailBody = @{
    enabled = $true
    config = @{
      host = 'smtp.gmail.com'
      port = '465'
      username = 'demo@example.com'
      password = 'demo-app-password'
      from_email = 'demo@example.com'
    }
  } | ConvertTo-Json -Compress
  Invoke-RestMethod -Uri "$baseUrl/assistant/connectors/gmail" -Method Put -ContentType 'application/json' -Body $gmailBody | Out-Null

  $telegramBody = @{
    enabled = $true
    config = @{
      bot_token = 'demo-telegram-token'
      default_chat_id = '2001'
      allowed_chat_ids = '2001,2002'
    }
  } | ConvertTo-Json -Compress
  Invoke-RestMethod -Uri "$baseUrl/assistant/connectors/telegram" -Method Put -ContentType 'application/json' -Body $telegramBody | Out-Null

  $baleBody = @{
    enabled = $true
    config = @{
      bot_token = 'demo-bale-token'
      default_chat_id = '3001'
      allowed_chat_ids = '3001,3002'
    }
  } | ConvertTo-Json -Compress
  Invoke-RestMethod -Uri "$baseUrl/assistant/connectors/bale" -Method Put -ContentType 'application/json' -Body $baleBody | Out-Null

  $uploadJson = & curl.exe -s -X POST -F "files=@$sampleFile" "$baseUrl/assistant/uploads"
  $uploads = $uploadJson | ConvertFrom-Json
  Assert-True ($uploads.Count -ge 1) 'Assistant upload did not return uploaded files.'

  $chatSession = Invoke-RestMethod -Uri "$baseUrl/assistant/sessions" -Method Post -ContentType 'application/json' -Body '{"title":"Verification chat","mode":"chat"}'
  $futureTime = [DateTime]::UtcNow.AddMinutes(30).ToString('o')
  $chatPayload = @{
    content = 'Run connector and sharing verification.'
    attachments = @(@{ id = $uploads[0].id; name = $uploads[0].name })
    assigned_tools = @(
      @{
        tool_id = 'file_share'
        parameters = @{ target_folder = (Join-Path $testWorkspace 'shared-output') }
      },
      @{
        tool_id = 'gmail'
        parameters = @{
          to = 'recipient@example.com'
          subject = 'Scheduled verification email'
          body = 'This is a scheduled test message.'
          scheduled_for = $futureTime
        }
      },
      @{
        tool_id = 'notification'
        parameters = @{
          title = 'Verification'
          message = 'Notification tool verified.'
        }
      }
    )
  } | ConvertTo-Json -Depth 6 -Compress
  $chatResponse = Invoke-RestMethod -Uri "$baseUrl/assistant/sessions/$($chatSession.id)/messages" -Method Post -ContentType 'application/json' -Body $chatPayload
  Assert-True ($chatResponse.message.actions.Count -ge 3) 'Assistant chat message did not execute the expected tools.'
  Assert-True (Test-Path (Join-Path $testWorkspace 'shared-output\verification-upload.txt')) 'File share tool did not copy the uploaded file.'

  $agentSession = Invoke-RestMethod -Uri "$baseUrl/assistant/sessions" -Method Post -ContentType 'application/json' -Body '{"title":"Verification agent","mode":"agent"}'
  $agentResponse = Invoke-RestMethod -Uri "$baseUrl/assistant/sessions/$($agentSession.id)/messages" -Method Post -ContentType 'application/json' -Body '{"content":"Prepare a release readiness checklist","attachments":[],"assigned_tools":[]}'
  $agentTaskId = ($agentResponse.message.actions | Where-Object { $_.type -eq 'workflow_task' } | Select-Object -First 1).task_id
  Assert-True ([string]::IsNullOrWhiteSpace($agentTaskId) -eq $false) 'Agent mode did not start a workflow task.'
  Start-Sleep -Seconds 1
  $agentArtifacts = Invoke-RestMethod -Uri "$baseUrl/tasks/$agentTaskId/artifacts"
  Assert-True (($agentArtifacts | ForEach-Object { $_.path }) -match 'agent-playbook.md') 'Agent mode did not attach the improvement playbook.'

  $notificationStatus = Invoke-RestMethod -Uri "$baseUrl/notifications/status"
  $notificationTest = Invoke-RestMethod -Uri "$baseUrl/notifications/test" -Method Post
  Assert-True ($notificationStatus.enabled) 'Notifications are not enabled.'
  Assert-True ($notificationTest.ok) 'Notification test call did not succeed.'

  $improvementStatus = Invoke-RestMethod -Uri "$baseUrl/improvement/status"
  $improvementRun = Invoke-RestMethod -Uri "$baseUrl/improvement/run" -Method Post
  $improvementConfig = Invoke-RestMethod -Uri "$baseUrl/improvement/config" -Method Put -ContentType 'application/json' -Body '{"enabled":true,"auto_review_interval_minutes":15}'
  Assert-True ($improvementStatus.enabled) 'Improvement loop is not enabled.'
  Assert-True ($improvementRun.lessons.Count -ge 1) 'Improvement review did not produce lessons.'
  Assert-True ($improvementConfig.auto_review_interval_minutes -eq 15) 'Improvement configuration did not update.'

  $computerStatusBefore = Invoke-RestMethod -Uri "$baseUrl/computer/session/status"
  $computerStart = Invoke-RestMethod -Uri "$baseUrl/computer/session/start" -Method Post -ContentType 'application/json' -Body (@{
    permission_mode = 'workspace'
    workspace_path = $testWorkspace
  } | ConvertTo-Json -Compress)
  $computerCommand = Invoke-RestMethod -Uri "$baseUrl/computer/terminal/command" -Method Post -ContentType 'application/json' -Body '{"command":"Get-Location","timeout":20,"admin":false}'
  $computerScreenshot = Invoke-RestMethod -Uri "$baseUrl/computer/screenshot" -Method Post
  $computerWindow = Invoke-RestMethod -Uri "$baseUrl/computer/windows/active"
  $computerHistory = Invoke-RestMethod -Uri "$baseUrl/computer/actions/history?limit=20"
  Assert-True ($computerStatusBefore.active -eq $false) 'Computer control session was unexpectedly already active.'
  Assert-True ($computerStart.active) 'Computer control session did not start.'
  Assert-True ($computerCommand.success) 'Computer control command execution failed.'
  Assert-True (Test-Path $computerScreenshot.path) 'Computer control screenshot file was not created.'
  Assert-True ($computerHistory.Count -ge 3) 'Computer control history did not record expected actions.'

  $connectors = Invoke-RestMethod -Uri "$baseUrl/assistant/connectors"
  $sessions = Invoke-RestMethod -Uri "$baseUrl/assistant/sessions"
  Assert-True (($connectors | Select-Object -ExpandProperty type) -contains 'telegram') 'Telegram connector is not persisted.'
  Assert-True (($connectors | Select-Object -ExpandProperty type) -contains 'bale') 'Bale connector is not persisted.'
  Assert-True (($sessions | Select-Object -ExpandProperty mode) -contains 'agent') 'Agent sessions are not persisted.'

  [pscustomobject]@{
    status = 'ok'
    taskCompleted = $completedTask.status
    taskArtifactCount = $taskArtifacts.Count
    assistantTools = ($tools | Select-Object -ExpandProperty id)
    connectors = ($connectors | Select-Object -ExpandProperty type)
    notificationsEnabled = $notificationStatus.enabled
    improvementLessons = $improvementRun.lessons.Count
    computerAdminAvailable = $computerStart.admin_available
    screenshotPath = $computerScreenshot.path
    packagedSmoke = 'Run separately with smoke-test-packaged-app.ps1'
  } | ConvertTo-Json -Depth 6 -Compress
}
finally {
  if ($settingsBefore) {
    try {
      Invoke-RestMethod -Uri "$baseUrl/settings" -Method Put -ContentType 'application/json' -Body (@{
        workspacePath = $settingsBefore.workspacePath
        safetyMode = $settingsBefore.safetyMode
        preferredModel = $settingsBefore.preferredModel
      } | ConvertTo-Json -Compress) | Out-Null
    } catch {}
  }
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
