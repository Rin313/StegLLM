#!/bin/bash
# This script requires Bash for [[ ]] and other Bash-specific features.

open_html() {
    local file="$1"

    # 检查文件是否存在
    if [[ ! -f "$file" ]]; then
        echo "Error: File $file does not exist."
        return 1
    fi

    # 将相对路径转换为绝对路径
    file="$(realpath "$file")"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$file" || echo "Error: Failed to open $file on macOS."
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
        # Windows
        start "" "$file" || echo "Error: Failed to open $file on Windows."
    elif command -v termux-open >/dev/null 2>&1; then
        # Termux
        termux-open "$file" || echo "Error: Failed to open $file in Termux."
    elif command -v xdg-open >/dev/null 2>&1; then
        # Linux (如果 xdg-open 可用)
        xdg-open "$file" || echo "Error: Failed to open $file on Linux."
    else
        echo "Unsupported OS or browser opener not found. Please open $file manually."
    fi
}

open_html "data/StegLLM.html"

# 查找第一个扩展名为 .llamafile 的文件
llamafile=$(find data/ -maxdepth 1 -name "*.llamafile" -print -quit)

if [[ -n "$llamafile" ]]; then
    "$llamafile" -c 8192 --no-mmap  --log-disable  --nocompile --unsecure --no-display-prompt --fast --server -spf system_prompt.txt --port 8090 --nobrowser --nologo
fi