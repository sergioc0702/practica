#!/bin/sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v pwsh >/dev/null 2>&1; then
    printf '%s\n' "No encontré PowerShell 7 (pwsh). Instálalo para abrir Pyme360:"
    printf '%s\n' "https://learn.microsoft.com/powershell/scripting/install/install-powershell"
    printf '\n%s' "Presiona Enter para cerrar..."
    read -r _
    exit 1
fi

pwsh -NoLogo -NoProfile -File "$SCRIPT_DIR/serve-local.ps1"
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
    printf '\n%s\n' "Pyme360 no pudo iniciar. Revisa el mensaje anterior."
    printf '%s' "Presiona Enter para cerrar..."
    read -r _
fi

exit "$STATUS"
