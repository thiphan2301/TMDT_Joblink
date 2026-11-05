$ErrorActionPreference = "Stop"

$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    throw "Python environment not found. Create it and install requirements.txt first."
}

Push-Location $PSScriptRoot
try {
    & $python -m uvicorn app:app --host 127.0.0.1 --port 8001 --http h11
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
