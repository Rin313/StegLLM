#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

gguf=""

for file in "$DATA_DIR"/*.gguf; do
    if [ -z "$gguf" ] && [ -f "$file" ]; then
        gguf="$file"
    fi
done

if [ -z "$gguf" ]; then
    echo "错误：在 $DATA_DIR 目录下未找到任何 .gguf 文件。"
    exit 1
fi

LLAMAFILE="$DATA_DIR/llamafile-0.9.2"

# 添加执行权限
chmod +x "$LLAMAFILE"

"$LLAMAFILE" \
    --server \
    -spf "$SCRIPT_DIR/system_prompt.json" \
    --host 127.0.0.1 --port 8090 \
    --timeout 15 \
    --path "$DATA_DIR/dist" \
    -m "$gguf" \
    -c 8192 \
    --no-mmap --nocompile --unsecure &