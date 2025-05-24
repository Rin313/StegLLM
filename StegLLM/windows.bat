@echo off
setlocal
set "buildNum=b5474"
set "scriptDir=%~dp0"
set "dataDir=%scriptDir%data"
:: 判断CPU指令集
set "ver=cpu-x64"
wmic cpu get Caption | findstr /i "ARM" >nul && set "ver=cpu-arm64"
:: 下载llama.cpp
set "name=llama-%buildNum%-bin-win-%ver%"
if not exist "%dataDir%\%name%\" (
    echo Downloading: %name%.zip
    curl --insecure --compressed -C - -Lo "%name%.zip" "https://github.com/ggml-org/llama.cpp/releases/download/%buildNum%/%name%.zip" || (echo Download failed. & pause & exit /b 1)
    powershell -command "Expand-Archive -Path '%name%.zip' -DestinationPath '%dataDir%\%name%' -Force" || (echo Extraction failed. & pause & exit /b 1)
    del "%name%.zip"
)
:: 查找gguf文件
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
:: start "" 让程序在新的窗口运行，不会阻塞后续命令。
start "" "%llamaServer%" ^
    -m "%gguf%" ^
    --path "%dataDir%\dist" ^
    --host 127.0.0.1 ^
    --port "%port%" ^
    -c 4096 ^
    --temp 0.8 ^
    --repeat-penalty 1.18 ^
    --repeat-last-n 128 ^
    --no-perf ^
    --prio 3 ^
    --prio-batch 3 ^
    --poll 100 ^
    --log-verbosity 0 ^
    --props ^
    --timeout 60 ^
    --no-slots ^
    --seed -1
echo Waiting for the server to start...
:waitloop
curl --silent http://127.0.0.1:%port%/StegLLM/ >nul 2>&1
IF ERRORLEVEL 1 (
    timeout /t 1 >nul
    goto waitloop
)
start http://127.0.0.1:%port%/StegLLM/
:: 结束局部变量环境
endlocal