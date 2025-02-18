#!/bin/bash

# 打开 HTML 文件 (跨平台)
open_html() {
  local file="$1"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$file"
  elif command -v xdg-open >/dev/null 2>&1; then
    # Linux (如果 xdg-open 可用)
    xdg-open "$file"
  elif [[ "$TERMUX_VERSION" ]]; then
      #Termux
      termux-open "$file"
  else
    echo "Unsupported OS or browser opener not found. Please open $file manually."
  fi
}

open_html "data/StegLLM.html"


# 查找第一个扩展名为 .llamafile 的文件 (更简洁的方式)
llamafile=$(find data/ -maxdepth 1 -name "*.llamafile" -print -quit)

# 如果找到了 .llamafile 文件，运行命令；否则提示错误
if [[ -n "$llamafile" ]]; then
    "$llamafile" -c 8192 --no-mmap  --log-disable  --nocompile --unsecure --no-display-prompt --fast --server -spf system_prompt.txt --port 8090 --nobrowser
else
    echo "No .llamafile file found in the data directory."
fi

# 暂停终端（仅在交互式 shell 中有效）
if [[ $- == *i* ]]; then
    read -p "Press Enter to continue..."
fi