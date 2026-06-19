# Starts the playground server and opens it in the default browser.
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
Start-Process "http://localhost:8000"
node serve.mjs
