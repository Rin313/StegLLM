@echo off
setlocal

set "gguf="

for %%a in (data\*.gguf) do (
    if not defined gguf (
        set "gguf=%%a"
    )
)

if not defined gguf (
    echo 错误：在 data 目录下未找到任何 .gguf 文件。
    exit /b 1
)
start "" /high /b "data\llamafile-0.9.2" ^
    --server ^
    -spf system_prompt.json ^
    --host 127.0.0.1 --port 8090 ^
    --timeout 15 ^
    --path data/dist ^
    -m "%gguf%" ^
    -c 8192 ^
    --no-mmap --nocompile --unsecure

:: 结束局部变量环境
endlocal