# Opens official URLs for ChatGPT connector troubleshooting (default browser).
# Usage: .\scripts\open-chatgpt-support-resources.ps1

$urls = @(
    'https://chatgpt.com/#settings/Connectors',
    'https://status.openai.com',
    'https://help.openai.com/en/collections/12923329-connected-apps',
    'https://help.figma.com/hc/en-us/articles/35326636109975-Use-ChatGPT-with-Figma'
)

foreach ($u in $urls) {
    Start-Process $u
}
