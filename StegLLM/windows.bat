@echo off
setlocal
set "buildNum=b9562"
set "scriptDir=%~dp0"
set "dataDir=%scriptDir%data"
set "ver=cpu-x64"
wmic cpu get Caption | findstr /i "ARM" >nul && set "ver=cpu-arm64"
set "name=llama-%buildNum%-bin-win-%ver%"
if not exist "%dataDir%\%name%\" (
    echo Downloading: %name%.zip
    curl --compressed -C - -Lo "%name%.zip" "https://github.com/ggml-org/llama.cpp/releases/download/%buildNum%/%name%.zip" || (echo Download failed. & pause & exit /b 1)
    powershell -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%name%.zip' -DestinationPath '%dataDir%\%name%' -Force" || (echo Extraction failed. & pause & exit /b 1)
    del "%name%.zip"
)
set "gguf="
for %%a in ("%dataDir%\*.gguf") do (
    if not defined gguf set "gguf=%%a"
)
if not defined gguf ( echo No .gguf file found in "%dataDir%" directory. & pause & exit /b 1)
for /r "%dataDir%\%name%" %%f in (llama-server.exe) do (
    set "llamaServer=%%f"
    goto :found
)
:found
set "port=8090"
start "" "%llamaServer%" ^
    -m "%gguf%" ^
    --path "%dataDir%\dist" ^
    --host 127.0.0.1 ^
    --port "%port%" ^
    -c 4096 ^
    --reasoning-budget 0 ^
    --reasoning-format none ^
    --sampling-seq edskymxt ^
    --min-p 0.0001 ^
    --repeat-penalty 1.18 ^
    --no-perf ^
    --flash-attn auto ^
    --slot-prompt-similarity 0.0 ^
    --prio 3 ^
    --prio-batch 3 ^
    --poll 100 ^
    --log-verbosity 0 ^
    --props ^
    --timeout 60 ^
    --seed -1
echo Waiting for the server to start...
:waitloop
timeout /t 1 >nul
set "status="
for /f %%s in ('curl --silent -o nul -w "%%{http_code}" http://127.0.0.1:%port%/') do set "status=%%s"
if "%status%"=="000" goto waitloop
if "%status%"=="503" goto waitloop
start http://127.0.0.1:%port%/
endlocal