@echo off
rem Started by the "WholesaleOrder" scheduled task (install-task.ps1). Keeps the app running:
rem when Node exits it is started again after 10 seconds. Arguments: <port> <path to node.exe>.
rem Other settings (SQL, Firebase) are read from api\.env.
setlocal
set "API_DIR=%~dp0..\..\api"
for %%I in ("%API_DIR%") do set "API_DIR=%%~fI"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=3005"
set "NODE_EXE=%~2"
if "%NODE_EXE%"=="" set "NODE_EXE=node"
set "NODE_ENV=production"
set "HOST=127.0.0.1"
cd /d "%API_DIR%"
if not exist logs mkdir logs

:run
rem Keep one previous log once the current one passes 10 MB.
for %%F in (logs\app.log) do if %%~zF GTR 10485760 move /y logs\app.log logs\app.previous.log >nul
rem The full script path lets update.ps1 find exactly this app's Node process.
"%NODE_EXE%" "%API_DIR%\src\server.js" >> logs\app.log 2>&1
echo [%date% %time%] app exited with code %errorlevel%, restarting in 10 seconds >> logs\app.log
rem ping as a delay: "timeout" fails when a scheduled task has no console.
ping -n 11 127.0.0.1 >nul
goto run
