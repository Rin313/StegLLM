@echo off
setlocal
set "buildNum=b5187"
set "scriptDir=%~dp0"
set "dataDir=%scriptDir%data"
:: 判断CPU指令集
set "ver="
wmic cpu get Caption | findstr /i "ARM" >nul && set "ver=llvm-arm64"
if not defined ver "%dataDir%\cpufetch_x86-64_windows.exe" | findstr /i "AVX512" >nul && set "ver=avx512-x64"
if not defined ver "%dataDir%\cpufetch_x86-64_windows.exe" | findstr /i "AVX2" >nul && set "ver=avx2-x64"
if not defined ver "%dataDir%\cpufetch_x86-64_windows.exe" | findstr /i "AVX" >nul && set "ver=avx-x64"
if not defined ver set "ver=noavx-x64"
:: 下载llama.cpp
set "name=llama-%buildNum%-bin-win-%ver%"
if not exist "%dataDir%\%name%\" (
    echo Downloading: %name%.zip
    curl --insecure -Lo "%name%.zip" "https://github.com/ggml-org/llama.cpp/releases/download/%buildNum%/%name%.zip" || (echo Download failed. & pause & exit /b 1)
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
curl --silent http://127.0.0.1:%port% >nul 2>&1
IF ERRORLEVEL 1 (
    timeout /t 1 >nul
    goto waitloop
)
start http://127.0.0.1:%port%
:: 结束局部变量环境
endlocal

:: start "" 让程序在新的窗口运行，不会阻塞后续命令。
:: -c 0 上下文大小使用模型默认值，但这可能对低端设备不友好
:: --no-perf 关闭内部性能计时
:: --prio 3 最高进程优先级，这是一个即开即用的实时需求。
:: --poll 100 全轮询(持续主动检查是否有新任务)
:: --timeout 600 读写超时时间(秒)
:: --log-verbosity 0 最基础的日志级别
:: props 允许通过接口修改全局属性
:: --no-slots 禁用槽监控，不需要运维数据
:: --repeat-penalty 重复惩罚，1.0为无惩罚
:: --repeat-last-n 惩罚最后n个token


:: --keep 能够让前n个token不会被抛弃，永远保持在上下文中
:: --defrag-thold KV缓存碎片整理的阈值。KV缓存会随着长文本推理产生"碎片"（无效空间），可能导致缓存空间利用率降低。
:: --no-kv-offload 禁用KV卸载，所有 KV 缓存都必须常驻在主内存或显存中，内存换性能
:: --mlock 锁定模型数据在物理内存，内存换性能
:: --no-mmap 一次性加载模型，加载速度更慢，内存占用似乎也会更高