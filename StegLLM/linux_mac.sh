#!/bin/bash

# 初始化 gguf 变量为空
gguf=""

# 查找 data 目录下第一个 .gguf 文件
for file in data/*.gguf; do
    if [ -z "$gguf" ] && [ -f "$file" ]; then
        gguf="$file"
        break
    fi
done

# 如果找到了 gguf 文件，则启动程序
if [ -n "$gguf" ]; then
    data/llamafile-0.9.2 --server -spf system_prompt.json --port 8090 --nologo \
        --path data/dist -m "$gguf" -c 8192 --no-mmap --log-disable \
        --nocompile --unsecure &
fi