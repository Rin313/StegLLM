@echo off
setlocal

:: 初始化变量 gguf 为空，用于存储找到的第一个 .gguf 文件的路径
set "gguf="

:: 遍历 data 目录下所有以 .gguf 结尾的文件
for %%a in (data\*.gguf) do (
    if not defined gguf (
        :: 存储第一个找到的 .gguf 文件路径
        set "gguf=%%a"
    )
)

:: 检查是否找到了 .gguf 文件
if not defined gguf (
    :: 如果没有找到 .gguf 文件，输出错误信息并退出脚本
    echo 错误：在 data 目录下未找到任何 .gguf 文件。
    exit /b 1
)

:: --server             以服务器模式运行
:: -spf system_prompt.json    指定系统提示文件
:: --host 127.0.0.1 --port 8090    指定服务器监听的主机地址和端口
:: --timeout 15         设置请求超时时间为 15 秒
:: --path data/dist     指定挂载的网页资源路径
:: -m "%gguf%"          指定使用的模型文件路径
:: -c 8192              设置上下文窗口大小为 8192
:: --no-mmap            禁用内存映射
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