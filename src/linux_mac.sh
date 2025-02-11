#!/bin/bash

# 打开 HTML 文件
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "data/StegLLM.html"
elif [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "linux-musl"* || "$OSTYPE" == "cygwin" || "$OSTYPE" == "msys" ]]; then
    # Linux 或 WSL
    xdg-open "data/StegLLM.html" &>/dev/null
else
    echo "Unsupported OS. Please open data/StegLLM.html manually."
fi

# 查找第一个扩展名为 .llamafile 的文件
llamafile=""
for file in data/*.llamafile; do
    if [[ -f "$file" ]]; then
        llamafile="$file"
        break
    fi
done

# 如果找到了 .llamafile 文件，运行命令；否则提示错误
if [[ -n "$llamafile" ]]; then
    "$llamafile" --server -spf system_prompt.txt --port 8090 --nobrowser --log-disable -c 0 --no-mmap --nocompile --unsecure --no-display-prompt --fast
else
    echo "No .llamafile file found in the data directory."
fi

# 暂停终端（仅在交互式 shell 中有效）
if [[ $- == *i* ]]; then
    read -p "Press Enter to continue..."
fi