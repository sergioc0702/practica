@echo off
setlocal EnableExtensions
title Preparar Python para Pyme360

echo.
echo  Pyme360 necesita Python 3.11 o superior para guardar los datos en SQLite.
echo  Este asistente solo prepara Python; no instala Pyme360 ni modifica tus datos.
echo.

rem Revisa versiones conocidas a traves del lanzador de Python.
for %%V in (3.15 3.14 3.13 3.12 3.11) do (
    py -%%V -c "import sys" >nul 2>&1
    if not errorlevel 1 goto :python_ready
)

rem Acepta tambien instalaciones recientes que exponen solo el comando python.
python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>&1
if not errorlevel 1 goto :python_ready

echo No encontre Python 3.11 o superior.
echo.
where winget >nul 2>&1
if errorlevel 1 goto :manual_install

choice /C SN /N /M "Quieres instalar Python 3.14 para tu usuario con winget? [S/N] "
if errorlevel 2 goto :cancelled

echo.
echo Se abrira el instalador de Python 3.14 mediante winget.
echo La instalacion es para tu usuario y puede tardar unos minutos.
echo.
winget install --id Python.Python.3.14 --exact --source winget --scope user --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :install_failed

echo.
echo Python quedo instalado. Cierra esta ventana y vuelve a abrir "Abrir Pyme360.bat".
echo Si Windows aun no encuentra Python, cierra sesion e inicia de nuevo, o reinicia el equipo.
goto :finish

:manual_install
echo Windows Package Manager (winget) no esta disponible en este equipo.
goto :open_python_download

:install_failed
echo.
echo No se pudo completar la instalacion con winget.
echo Puedes descargar el instalador desde la pagina oficial de Python.

:open_python_download
start "" "https://www.python.org/downloads/windows/"
echo En el instalador, elige una version 3.11 o superior y activa "Add python.exe to PATH".
echo Cuando termine, vuelve a abrir "Abrir Pyme360.bat".
goto :finish

:python_ready
echo Ya hay una version compatible de Python instalada.
echo Abre "Abrir Pyme360.bat" para iniciar Pyme360.
goto :finish

:cancelled
echo No se instalo nada. Puedes volver a ejecutar este asistente cuando quieras.

:finish
echo.
pause
endlocal
