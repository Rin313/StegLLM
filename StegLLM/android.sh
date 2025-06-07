#!/bin/bash
set -x
scriptDir="$(dirname "$(realpath "$0")")"
dataDir="${scriptDir}/data"
# 查找 gguf 文件
gguf=""
for file in "${dataDir}"/*.gguf; do
    if [ -f "$file" ]; then
        gguf="$file"
        break
    fi
done
if [ -z "$gguf" ]; then
    echo "No .gguf file found in '${dataDir}' directory."
    exit 1
fi
# 启动 llama-server
llamaServer=$(find "${dataDir}/bin" -type f -name 'llama-server' | head -n 1)
port=8090
"$llamaServer" \
    -m "$gguf" \
    --path "${dataDir}/dist" \
    --host 127.0.0.1 \
    --port "$port" \
    -c 4096 \
    --reasoning-budget 0 \
    --sampling-seq edskypxt \
    --repeat-penalty 1.18 \
    --no-perf \
    --prio 3 \
    --prio-batch 3 \
    --poll 100 \
    --log-verbosity 0 \
    --props \
    --timeout 60 \
    --no-slots \
    --seed -1 &
echo "Waiting for the server to start..."
while ! curl --silent "http://127.0.0.1:${port}/StegLLM/" >/dev/null 2>&1; do
    sleep 1
done
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:${port}/StegLLM/"
elif command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:${port}/StegLLM/"
else
    echo "Server is running at http://127.0.0.1:${port}/StegLLM/. Please open it manually in your browser."
fi