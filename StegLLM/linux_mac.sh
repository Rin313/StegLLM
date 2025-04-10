#!/bin/bash

gguf=""

for file in data/*.gguf; do
    if [ -z "$gguf" ] && [ -f "$file" ]; then
        gguf="$file"
    fi
done

if [ -z "$gguf" ]; then
    echo "错误：在 data 目录下未找到任何 .gguf 文件。"
    exit 1
fi

data/llamafile-0.9.2 \
    --server \
    -spf system_prompt.json \
    --host 127.0.0.1 --port 8090 \
    --timeout 15 \
    --path data/dist \
    -m "$gguf" \
    -c 8192 \
    --no-mmap --nocompile --unsecure &