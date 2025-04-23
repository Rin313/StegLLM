@echo off
setlocal

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "DATA_DIR=%SCRIPT_DIR%data"

set "gguf="

for %%a in ("%DATA_DIR%\*.gguf") do (
    if not defined gguf (
        set "gguf=%%a"
    )
)

if not defined gguf (
    echo 错误：在 "%DATA_DIR%" 目录下未找到任何 .gguf 文件。
    exit /b 1
)

set "LLAMAFILE=%DATA_DIR%\llamafile-0.9.2"

start "" /high /b "%LLAMAFILE%" ^
    --server ^
    -spf "%SCRIPT_DIR%system_prompt.json" ^
    --host 127.0.0.1 --port 8090 ^
    --timeout 15 ^
    --path "%DATA_DIR%\dist" ^
    -m "%gguf%" ^
    -c 8192 ^
    --no-mmap --nocompile --unsecure

:: 结束局部变量环境
endlocal